import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type EventHistory = {
  id: string;
  old_status: string;
  new_status: string;
  remarks: string | null;
  created_at: string;
  changed_by: string; // UUID
  profiles: { first_name: string; last_name: string; role: string } | null;
};

type ReturnReasonDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
};

const statusMap: { [key: string]: string } = {
  pending_hod: 'Pending HOD',
  returned_to_coordinator: 'Returned to Coordinator',
  pending_dean: 'Pending Dean',
  returned_to_hod: 'Returned to HOD',
  pending_principal: 'Pending Principal',
  returned_to_dean: 'Returned to Dean',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const ReturnReasonDialog = ({ event, isOpen, onClose }: ReturnReasonDialogProps) => {
  const [history, setHistory] = useState<EventHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !event?.id) return;

    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_history')
        .select(`
          *,
          profiles ( first_name, last_name, role )
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load event history.');
        console.error(error);
        setHistory([]);
      } else {
        setHistory(data as EventHistory[]);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [isOpen, event?.id]);

  const filteredHistory = history.filter(h => h.remarks);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review History for: {event?.title}</DialogTitle>
          <DialogDescription>
            History of status changes and remarks from approvers.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No return or rejection remarks found for this event.
          </div>
        ) : (
          <ScrollArea className="h-96 p-4 border rounded-md">
            <div className="space-y-6">
              {filteredHistory.map((item, index) => (
                <div key={item.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium">
                      {item.profiles?.first_name} {item.profiles?.last_name} 
                      <Badge variant="secondary" className="ml-2 capitalize">{item.profiles?.role}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs mb-2">
                    <Badge variant="outline" className="capitalize">{statusMap[item.old_status] || item.old_status}</Badge>
                    <ArrowRight className="h-3 w-3 mx-2 text-gray-500" />
                    <Badge className="capitalize bg-primary text-primary-foreground">
                      {statusMap[item.new_status] || item.new_status}
                    </Badge>
                  </div>

                  <p className="text-sm mt-2 p-3 bg-muted rounded-md border">
                    {item.remarks}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnReasonDialog;