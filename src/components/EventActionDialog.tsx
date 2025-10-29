import { useState } from 'react';
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

const formSchema = z.object({
  remarks: z.string().optional(),
});

type EventActionDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onActionSuccess: () => void;
  role: 'hod' | 'dean' | 'principal';
};

const roleActions = {
  hod: {
    approve: { label: 'Approve & Forward to Dean', status: 'pending_dean' },
    reject: { label: 'Reject', status: 'rejected' },
    return: { label: 'Return to Teacher', status: 'returned_to_teacher' },
  },
  dean: {
    approve: { label: 'Approve & Forward to Principal', status: 'pending_principal' },
    reject: { label: 'Reject', status: 'rejected' },
    return: { label: 'Return to HOD', status: 'returned_to_hod' },
  },
  principal: {
    approve: { label: 'Approve Event', status: 'approved' },
    reject: { label: 'Reject', status: 'rejected' },
    return: { label: 'Return to Dean', status: 'returned_to_dean' },
  },
};

const EventActionDialog = ({ event, isOpen, onClose, onActionSuccess, role }: EventActionDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const actions = roleActions[role];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { remarks: event.remarks || '' },
  });

  const handleAction = async (newStatus: string) => {
    const remarks = form.getValues('remarks');
    if ((newStatus === 'rejected' || newStatus.startsWith('returned')) && !remarks) {
      form.setError('remarks', { type: 'manual', message: 'Remarks are required to reject or return an event.' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus, remarks })
      .eq('id', event.id);

    if (error) {
      toast.error(`Failed to update event: ${error.message}`);
    } else {
      toast.success('Event status updated successfully.');
      onActionSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Event: {event.title}</DialogTitle>
          <DialogDescription>
            Submitted by: {event.profiles?.first_name} {event.profiles?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 text-sm">
          <p><strong>Venue:</strong> {event.venues?.name}</p>
          <p><strong>Date:</strong> {format(new Date(event.event_date), 'PPP')}</p>
          <p><strong>Time:</strong> {event.start_time} - {event.end_time}</p>
          <p><strong>Description:</strong> {event.description || 'N/A'}</p>
        </div>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add remarks (required for rejection/return)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => handleAction(actions.reject.status)}
              disabled={isSubmitting}
            >
              {actions.reject.label}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction(actions.return.status)}
              disabled={isSubmitting}
            >
              {actions.return.label}
            </Button>
          </div>
          <Button
            onClick={() => handleAction(actions.approve.status)}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Submitting...' : actions.approve.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventActionDialog;