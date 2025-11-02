import { useState, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Download, UploadCloud, FileDown, Loader2, Image, Users, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveAs } from 'file-saver';

const MAX_PHOTO_SIZE = 1024 * 1024; // 1MB
const PDF_MARGIN_MM = 10; // 10mm margin on all sides

const formSchema = z.object({
  registered_users_file: z.any().optional(),
  event_photo_file: z.any().optional(),
});

type ReportData = {
  aiReport: string;
  registeredUsers: any[];
  photoUrl: string | null;
};

type EventReportGeneratorDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
};

const EventReportGeneratorDialog = ({ event, isOpen, onClose }: EventReportGeneratorDialogProps) => {
  const [step, setStep] = useState(1); // 1: Uploads, 2: AI Generation, 3: Preview
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [eventPhotoFile, setEventPhotoFile] = useState<File | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const isEventEnded = useMemo(() => {
    if (!event) return false;
    
    const endDate = event.end_date || event.event_date;
    const endTime = event.end_time; // HH:mm format
    
    if (!endDate || !endTime) return false;

    try {
      const [h, m] = endTime.split(':').map(Number);
      const eventEndDateTime = new Date(endDate);
      eventEndDateTime.setHours(h, m, 0, 0);
      
      return isPast(eventEndDateTime);
    } catch (e) {
      return false;
    }
  }, [event]);

  // --- File Handling ---

  const onDropPhoto = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      toast.error('Photo upload failed. Max 1MB, JPEG only.');
      setEventPhotoFile(null);
      return;
    }
    if (acceptedFiles.length > 0) {
      setEventPhotoFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps, isDragActive: isPhotoDragActive } = useDropzone({
    onDrop: onDropPhoto,
    accept: { 'image/jpeg': ['.jpeg', '.jpg'] },
    maxFiles: 1,
    maxSize: MAX_PHOTO_SIZE,
  });

  const onDropUsers = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // Use header: 1 to get array of arrays, then map to objects to ensure consistent keys
          const json: any[] = XLSX.utils.sheet_to_json(worksheet);
          
          if (json.length === 0) {
            toast.error('Registered users file is empty.');
            setRegisteredUsers([]);
            return;
          }
          setRegisteredUsers(json);
          toast.success(`${json.length} registered users loaded.`);
        } catch (e) {
          toast.error('Failed to parse XLSX file.');
          setRegisteredUsers([]);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const { getRootProps: getUsersRootProps, getInputProps: getUsersInputProps, isDragActive: isUsersDragActive } = useDropzone({
    onDrop: onDropUsers,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Name: 'Participant 1', Email: 'p1@example.com', Department: 'CSE' },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Users');
    XLSX.writeFile(workbook, 'registered_users_template.xlsx');
  };

  // --- AI Generation ---

  const handleGenerateReport = async () => {
    if (!eventPhotoFile) {
      toast.error('Please upload the event photo first.');
      return;
    }
    if (registeredUsers.length === 0) {
      toast.error('Please upload the registered users list first.');
      return;
    }

    setIsGenerating(true);
    let photoUrl = null;

    try {
      // 1. Upload Event Photo
      const fileExt = eventPhotoFile.name.split('.').pop();
      const fileName = `${event.id}_photo_${Date.now()}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event_reports')
        .upload(filePath, eventPhotoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event_reports')
        .getPublicUrl(filePath);
      photoUrl = publicUrl;

      // 2. Call Edge Function for AI Report Generation
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-event-report', {
        body: {
          event_id: event.id,
          registered_users_count: registeredUsers.length,
        },
      });

      if (aiError) throw aiError;
      if (aiData.error) throw new Error(aiData.error);

      setReportData({
        aiReport: aiData.report,
        registeredUsers: registeredUsers,
        photoUrl: photoUrl,
      });
      setStep(3); // Move to preview step

    } catch (e: any) {
      toast.error(`Report generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- PDF Generation ---

  const handleDownloadPdf = async () => {
    if (!reportData || !reportRef.current) return;

    toast.loading('Generating PDF...', { id: 'pdf-gen' });

    try {
      const docxButton = document.getElementById('docx-download-button');
      if (docxButton) docxButton.style.display = 'none';

      const mainCanvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      if (docxButton) docxButton.style.display = 'inline-flex';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      const contentWidthMM = pdfPageWidth - 2 * PDF_MARGIN_MM;
      const contentHeightMM = pdfPageHeight - 2 * PDF_MARGIN_MM;
      
      const scaleFactor = contentWidthMM / mainCanvas.width;
      const totalHeightMM = mainCanvas.height * scaleFactor;
      
      let yPositionOnCanvasPx = 0;
      const pages = Math.ceil(totalHeightMM / contentHeightMM);

      for (let i = 0; i < pages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const sliceHeightPx = Math.min(
          mainCanvas.height - yPositionOnCanvasPx,
          contentHeightMM / scaleFactor
        );
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = sliceHeightPx;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(
            mainCanvas,
            0, yPositionOnCanvasPx, mainCanvas.width, sliceHeightPx,
            0, 0, mainCanvas.width, sliceHeightPx
          );

          const sliceImgData = tempCanvas.toDataURL('image/png');
          const sliceHeightMM = sliceHeightPx * scaleFactor;
          
          pdf.addImage(
            sliceImgData, 'PNG',
            PDF_MARGIN_MM, PDF_MARGIN_MM,
            contentWidthMM, sliceHeightMM
          );
        }
        
        yPositionOnCanvasPx += sliceHeightPx;
      }
      
      const filename = `${event.title.replace(/\s/g, '_')}_Final_Report.pdf`;
      pdf.save(filename);

      toast.success('PDF downloaded successfully!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF.', { id: 'pdf-gen' });
    }
  };
  
  // --- DOCX Generation ---
  const handleDownloadDocx = () => {
    if (!reportData) return;

    const filename = `${event.title.replace(/\s/g, '_')}_Final_Report.doc`;
    
    // Simplified HTML structure for DOCX to ensure block rendering and better alignment
    const tableRows = reportData.registeredUsers.map((user, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc; font-size: 10pt;">${user.name || user.Name || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; font-size: 10pt;">${user.email || user.Email || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; font-size: 10pt;">${user.department || user.Department || 'N/A'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 1in; /* Set document margins */
            width: 100%;
          }
          h1, h2, h3 { color: #1f4e79; margin-top: 1em; margin-bottom: 0.5em; text-align: center; }
          .section-title { text-align: left; font-weight: bold; font-size: 12pt; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .text-center { text-align: center; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .p-4 { padding: 16px; }
          .border { border: 1px solid #ccc; }
          .rounded-md { border-radius: 6px; }
          .bg-gray-50 { background-color: #f9f9f9; }
          .ai-report { font-size: 10pt; line-height: 1.5; white-space: pre-wrap; }
          
          /* Table Styles */
          .table-container { margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10pt; background-color: #f2f2f2; font-weight: bold; }
          
          /* Image Styles for DOCX */
          .photo-container { text-align: center; margin-top: 20px; margin-bottom: 20px; }
          .photo-container img { 
            max-width: 400px; 
            max-height: 300px; 
            height: auto; 
            display: block; 
            margin: 10px auto; /* Center image */
          }
        </style>
      </head>
      <body>
        <div class="text-center mb-4">
          <h1 style="font-size: 18pt; font-weight: bold; color: #1f4e79;">Final Event Report</h1>
          <h2 style="font-size: 14pt; color: #2a6496;">${event.title}</h2>
          <p style="font-size: 10pt; color: #666;">Date: ${format(new Date(event.event_date), 'PPP')}</p>
        </div>

        <!-- AI Generated Report -->
        <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #ccc; background-color: #f9f9f9;">
          <h3 style="font-size: 12pt; font-weight: bold; margin-bottom: 10px; text-align: left;">AI Generated Narrative Report</h3>
          <div class="ai-report" style="font-size: 10pt; line-height: 1.5;">${reportData.aiReport}</div>
        </div>

        <!-- Event Photo -->
        ${reportData.photoUrl ? `
          <div class="photo-container">
            <h3 class="section-title">Event Photo</h3>
            <img 
              src="${reportData.photoUrl}" 
              alt="Event Photo" 
              style="max-width: 400px; max-height: 300px; height: auto; display: block; margin: 10px auto;"
            />
          </div>
        ` : ''}

        <!-- Registered Users Summary -->
        <div class="table-container">
          <h3 class="section-title">Registered Users (${reportData.registeredUsers.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], {
      type: 'application/msword;charset=utf-8',
    });

    saveAs(blob, filename);
    toast.success('DOCX file downloaded successfully!');
  };

  // --- Render Helpers ---

  const renderReportContent = () => {
    if (!reportData) return null;

    return (
      <div className="p-4 bg-white text-black" ref={reportRef}>
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-800">Final Event Report</h1>
          <h2 className="text-lg font-semibold text-primary">{event.title}</h2>
          <p className="text-sm text-gray-600">Date: {format(new Date(event.event_date), 'PPP')}</p>
        </div>

        {/* AI Generated Report */}
        <div className="mb-6 p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
          <h3 className="text-base font-bold mb-2">AI Generated Narrative Report</h3>
          <div className="ai-report text-sm">{reportData.aiReport}</div>
        </div>

        {/* Event Photo */}
        {reportData.photoUrl && (
          <div className="mb-6 photo-container">
            <h3 className="text-base font-bold mb-2">Event Photo</h3>
            <img 
              src={reportData.photoUrl} 
              alt="Event Photo" 
              className="w-full h-auto object-contain rounded-md shadow-md"
              style={{ maxWidth: '400px', maxHeight: '300px', margin: '0 auto' }} // Fixed size for PDF/DOCX
            />
          </div>
        )}

        {/* Registered Users Summary - Displaying all users without scroll */}
        <div className="mb-6 table-container">
          <h3 className="text-base font-bold mb-2 p-2">Registered Users ({reportData.registeredUsers.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.registeredUsers.map((user, index) => (
                <TableRow key={index}>
                  <TableCell>{user.name || user.Name || 'N/A'}</TableCell>
                  <TableCell>{user.email || user.Email || 'N/A'}</TableCell>
                  <TableCell>{user.department || user.Department || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const handleClose = () => {
    setStep(1);
    setReportData(null);
    setRegisteredUsers([]);
    setEventPhotoFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-4xl max-h-[95vh] overflow-y-auto", step === 3 && "sm:max-w-5xl")}>
        <DialogHeader>
          <DialogTitle>Generate Final Report: {event?.title}</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Step 1: Upload required files (Registered Users List & Event Photo).'}
            {step === 2 && 'Step 2: Generate AI Narrative Report.'}
            {step === 3 && 'Step 3: Review and Download Final PDF Report.'}
          </DialogDescription>
        </DialogHeader>
        
        {!isEventEnded && (
          <div className="text-center p-8 text-red-500 font-semibold">
            This event has not ended yet. Report generation is only available after the event concludes.
          </div>
        )}

        {isEventEnded && (
          <Form {...form}>
            <form className="space-y-6">
              {/* Step 1: Uploads */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Registered Users Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center"><Users className="h-5 w-5 mr-2" /> Registered Users List (XLSX)</h3>
                    <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="w-full">
                      <FileDown className="mr-2 h-4 w-4" /> Download Template
                    </Button>
                    <div
                      {...getUsersRootProps()}
                      className={cn(
                        'p-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors',
                        isUsersDragActive ? 'border-primary bg-primary/10' : 'border-border'
                      )}
                    >
                      <input {...getUsersInputProps()} />
                      <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      {registeredUsers.length > 0 ? (
                        <p className="text-sm font-medium text-green-600">{registeredUsers.length} users loaded.</p>
                      ) : (
                        <p>Drag & drop XLSX file here, or click to select</p>
                      )}
                    </div>
                  </div>

                  {/* Event Photo Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center"><Image className="h-5 w-5 mr-2" /> Event Photo (JPEG, Max 1MB)</h3>
                    <div
                      {...getPhotoRootProps()}
                      className={cn(
                        'p-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors h-full flex flex-col justify-center',
                        isPhotoDragActive ? 'border-primary bg-primary/10' : 'border-border'
                      )}
                    >
                      <input {...getPhotoInputProps()} />
                      <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      {eventPhotoFile ? (
                        <p className="text-sm font-medium">{eventPhotoFile.name}</p>
                      ) : (
                        <p>Drag & drop JPEG photo here, or click to select file</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Generation */}
              {step === 2 && (
                <div className="text-center p-10 space-y-4">
                  <h3 className="text-xl font-semibold">Ready to Generate Report</h3>
                  <p className="text-muted-foreground">
                    The AI will analyze the event details and generate a comprehensive 500-word report.
                  </p>
                  <Button 
                    type="button" 
                    onClick={handleGenerateReport} 
                    disabled={isGenerating}
                    className="w-64"
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      'Generate AI Report'
                    )}
                  </Button>
                </div>
              )}

              {/* Step 3: Preview */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Final Report Preview</h3>
                  <div className="border rounded-lg overflow-hidden">
                    {renderReportContent()}
                  </div>
                </div>
              )}
            </form>
          </Form>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {step === 1 && isEventEnded && (
              <Button 
                type="button" 
                onClick={() => setStep(2)} 
                disabled={registeredUsers.length === 0 || !eventPhotoFile}
              >
                Next: Generate Report
              </Button>
            )}
            {step === 2 && (
              <Button type="button" onClick={() => setStep(1)} variant="outline" disabled={isGenerating}>
                Back to Uploads
              </Button>
            )}
            {step === 3 && (
              <>
                <Button type="button" onClick={handleDownloadDocx} disabled={!reportData} id="docx-download-button">
                  <FileText className="mr-2 h-4 w-4" /> Download DOCX
                </Button>
                <Button onClick={handleDownloadPdf} disabled={!reportData}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventReportGeneratorDialog;