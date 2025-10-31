import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
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
import { toast } from 'sonner';
import { UploadCloud, FileDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type BulkUserUploadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type UploadResult = {
  email: string;
  success: boolean;
  error?: string;
};

const BulkUserUploadDialog = ({ isOpen, onClose, onSuccess }: BulkUserUploadDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<UploadResult[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setUploadErrors([]); // Clear previous errors on new file drop
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        role: 'coordinator', // Must be one of: admin, coordinator, hod, dean, principal
        department: 'Computer Science (B.E)', // Required for coordinator and hod roles
        club: 'Coding Club', // Optional, for coordinator role
        professional_society: 'IEEE', // Optional, for coordinator role
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, 'user_upload_template.xlsx');
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadErrors([]);
    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error('The uploaded file is empty.');
        }

        const { data: responseData, error } = await supabase.functions.invoke('admin-create-users', {
          body: json,
        });

        if (error) throw error;

        const results: UploadResult[] = responseData.results;
        const failedResults = results.filter((r) => !r.success);
        const successCount = results.length - failedResults.length;

        if (successCount > 0) {
          toast.success(`${successCount} user invitation(s) sent successfully.`);
        }

        if (failedResults.length > 0) {
          setUploadErrors(failedResults);
          toast.error(`${failedResults.length} user invitation(s) failed to send. See details below.`);
        } else {
          onSuccess();
          onClose();
        }
        
      } catch (e: any) {
        toast.error(`Upload failed: ${e.message}`);
      } finally {
        setIsUploading(false);
        setFiles([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClose = () => {
    setFiles([]);
    setUploadErrors([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk User Upload</DialogTitle>
          <DialogDescription>
            Upload an XLSX file to invite multiple users. An email will be sent to each user to set up their account.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
            <FileDown className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <div
            {...getRootProps()}
            className={`p-8 border-2 border-dashed rounded-md text-center cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            <input {...getInputProps()} />
            {files.length > 0 ? (
              <p>{files[0].name}</p>
            ) : (
              <>
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p>Drag & drop an XLSX file here, or click to select</p>
              </>
            )}
          </div>

          {uploadErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-xs">
                  {uploadErrors.map((err, index) => (
                    <li key={index}><strong>{err.email}:</strong> {err.error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={isUploading || files.length === 0}>
            {isUploading ? 'Uploading...' : 'Upload & Send Invitations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUserUploadDialog;