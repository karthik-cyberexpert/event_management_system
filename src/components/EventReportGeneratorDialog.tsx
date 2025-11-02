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
import { Download, UploadCloud, FileDown, Loader2, Image, Users } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
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

const MAX_PHOTO_SIZE = 1024 * 1024; // 1MB

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

  const handlePrint = () => {
    if (!reportRef.current) return;

    const printContents = reportRef.current.innerHTML;
    
    const printableContainer = document.createElement('div');
    printableContainer.className = 'printable-container';
    printableContainer.innerHTML = printContents;
    document.body.appendChild(printableContainer);

    toast.info("Your browser's print dialog will open. Please select 'Save as PDF'.");

    setTimeout(() => {
      window.print();
      document.body.removeChild(printableContainer);
    }, 500);
  };
  
  // --- Render Helpers ---

  const renderReportContent = () => {
    if (!reportData) return null;

    return (
      <div className="printable-report" ref={reportRef}>
        <div className="p-4 bg-white text-black">
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
        <DialogHeader className="print:hidden">
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
                  <h3 className="text-xl font-semibold print:hidden">Final Report Preview</h3>
                  <div className="border rounded-lg overflow-hidden">
                    {renderReportContent()}
                  </div>
                </div>
              )}
            </form>
          </Form>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center gap-2 print:hidden">
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
                <Button onClick={handlePrint} disabled={!reportData}>
                  <Download className="mr-2 h-4 w-4" /> Print / Save as PDF
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