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
import { Badge } from './ui/badge';

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
    approve: { label: 'Approve & Forward to Dean', status: 'pending_dean', timestampField: 'hod_approval_at' },
    reject: { label: 'Reject', status: 'rejected' },
    return: { label: 'Return to Teacher', status: 'returned_to_teacher' },
  },
  dean: {
    approve: { label: 'Approve & Forward to Principal', status: 'pending_principal', timestampField: 'dean_approval_at' },
    reject: { label: 'Reject', status: 'rejected' },
    return: { label: 'Return to HOD', status: 'returned_to_hod' },
  },
  principal: {
    approve: { label: 'Approve Event', status: 'approved', timestampField: 'principal_approval_at' },
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

  const handleAction = async (actionType: 'approve' | 'reject' | 'return') => {
    const action = actions[actionType];
    const remarks = form.getValues('remarks');
    
    if ((actionType === 'reject' || actionType === 'return') && !remarks) {
      form.setError('remarks', { type: 'manual', message: 'Remarks are required to reject or return an event.' });
      return;
    }

    setIsSubmitting(true);
    
    const updatePayload: { status: string, remarks: string | null, [key: string]: any } = {
      status: action.status,
      remarks: remarks || null,
    };

    // Set approval timestamp if approving
    if (actionType === 'approve' && action.timestampField) {
      updatePayload[action.timestampField] = new Date().toISOString();
    }

    const { error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', event.id);

    if (error) {
      toast.error(`Failed to update event: ${error.message}`);
    } else {
      toast.success('Event status updated successfully.');
      onActionSuccess();
    }
    setIsSubmitting(false);
  };

  const formatArray = (arr: string[] | null | undefined) => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.map(item => item.charAt(0).toUpperCase() + item.slice(1).replace(/_/g, ' ')).join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Event: {event.title}</DialogTitle>
          <DialogDescription>
            Submitted by: {event.profiles?.first_name} {event.profiles?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <p><strong>Department/Club:</strong> {event.department_club || 'N/A'}</p>
            <p><strong>Mode:</strong> <Badge variant="secondary" className="capitalize">{event.mode_of_event || 'N/A'}</Badge></p>
            <p><strong>Coordinator:</strong> {event.coordinator_name || 'N/A'}</p>
            <p><strong>Contact:</strong> {event.coordinator_contact || 'N/A'}</p>
            <p><strong>Date:</strong> {format(new Date(event.event_date), 'PPP')}</p>
            <p><strong>Time:</strong> {event.start_time} - {event.end_time}</p>
            <p><strong>Venue:</strong> {event.venues?.name || 'N/A'}</p>
            <p><strong>Expected Participants:</strong> {event.expected_audience || 'N/A'}</p>
          </div>

          <p><strong>Description:</strong> {event.description || 'N/A'}</p>
          <p><strong>Objective:</strong> {event.objective || 'N/A'}</p>
          <p><strong>Proposed Outcomes:</strong> {event.proposed_outcomes || 'N/A'}</p>
          <p><strong>Category:</strong> {formatArray(event.category)}</p>
          <p><strong>Target Audience:</strong> {formatArray(event.target_audience)}</p>
          <p><strong>SDG Alignment:</strong> {formatArray(event.sdg_alignment)}</p>
          
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <p><strong>Speakers:</strong> {event.speakers || 'N/A'}</p>
            <p><strong>Speaker Details:</strong> {event.speaker_details || 'N/A'}</p>
            <p><strong>Budget Estimate:</strong> ₹{event.budget_estimate?.toFixed(2) || '0.00'}</p>
            <p><strong>Funding Source:</strong> {event.budget_estimate > 0 ? formatArray(event.funding_source) : 'N/A (No budget)'}</p>
            <p className="col-span-2"><strong>Promotion Strategy:</strong> {formatArray(event.promotion_strategy)}</p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p><strong>HOD Approval Date:</strong> {event.hod_approval_at ? format(new Date(event.hod_approval_at), 'PPP p') : 'Pending'}</p>
            <p><strong>Dean Approval Date:</strong> {event.dean_approval_at ? format(new Date(event.dean_approval_at), 'PPP p') : 'Pending'}</p>
            <p><strong>Principal Approval Date:</strong> {event.principal_approval_at ? format(new Date(event.principal_approval_at), 'PPP p') : 'Pending'}</p>
          </div>
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
              onClick={() => handleAction('reject')}
              disabled={isSubmitting}
            >
              {actions.reject.label}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('return')}
              disabled={isSubmitting}
            >
              {actions.return.label}
            </Button>
          </div>
          <Button
            onClick={() => handleAction('approve')}
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