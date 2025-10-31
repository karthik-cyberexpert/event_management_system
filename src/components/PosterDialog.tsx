import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download } from 'lucide-react';

type PosterDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  posterUrl: string;
  eventTitle: string;
};

const PosterDialog = ({ isOpen, onClose, posterUrl, eventTitle }: PosterDialogProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = `${eventTitle.replace(/\s/g, '_')}_Poster.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Poster: {eventTitle}</DialogTitle>
          <DialogDescription>
            Review the promotional poster uploaded for this event.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center items-center p-4 bg-muted rounded-md">
          {posterUrl ? (
            <img 
              src={posterUrl} 
              alt={`Poster for ${eventTitle}`} 
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : (
            <p className="text-muted-foreground">Poster not available.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {posterUrl && (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PosterDialog;