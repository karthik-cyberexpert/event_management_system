import { useState } from 'react';
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
import { format } from 'date-fns';

type RevokeApprovalDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onRevokeSuccess: () => void;
  role: 'hod' | 'dean' | 'principal';
};

const RevokeApprovalDialog = ({ event, isOpen, onClose, onRevokeSuccess, role }: RevokeApprovalDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRevoke = async () => {
    setIsSubmitting(true);
    
    let newStatus: 'pending_hod' | 'pending_dean' | 'pending_principal';
    let timestampFieldToClear: 'hod_approval_at' | 'dean_approval_at' | 'principal_approval_at';
    let nextStatus: 'pending_hod' | 'pending_dean' | 'pending_principal';

    if (role === 'hod') {
      newStatus = 'pending_hod';
      timestampFieldToClear = 'hod_approval_at';
      nextStatus = 'pending_dean';
    } else if (role === 'dean') {
      newStatus = 'pending_dean';
      timestampFieldToClear = 'dean_approval_at';
      nextStatus = 'pending_principal';
    } else if (role === 'principal') {
      // If principal revokes, the event goes back to pending dean
      newStatus = 'pending_dean';
      timestampFieldToClear = 'principal_approval_at';
      nextStatus = 'approved'; // This is the final status, but we don't use it here.
    } else {
      setIsSubmitting(false);
      return;
    }

    // Determine the status to revert to.
    // HOD revocation sends it back to pending HOD (for re-review).
    // Dean revocation sends it back to pending Dean (for re-review).
    // Principal revocation sends it back to pending Dean (for re-review).
    
    let statusToRevertTo: 'pending_hod' | 'pending_dean' | 'pending_principal';
    let remarks = `Approval revoked by ${role.toUpperCase()}. Status reverted to `;

    if (role === 'hod') {
        statusToRevertTo = 'pending_hod';
        remarks += 'Pending HOD.';
    } else if (role === 'dean') {
        statusToRevertTo = 'pending_dean';
        remarks += 'Pending Dean.';
    To
    } else { // principal
        statusToRevertTo = 'pending_dean'; // Principal revocation sends it back to Dean
        remarks += 'Pending Dean.';
    }

    // Clear the current role's approval timestamp and subsequent timestamps
    const updatePayload: any = {
        status: statusToRevertTo,
        remarks: remarks,
    };

    if (role === 'hod') {
        updatePayload.hod_approval_at = null;
        updatePayload.dean_approval_at = null;
        updatePayload.principal_approval_at = null;
    } else if (role === 'dean') {
        updatePayload.dean_approval_at = null;
        updatePayload.principal_approval_at = null;
    } else if (role === 'principal') {
        updatePayload.principal_approval_at = null;
    }

    const { error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', event.id);

    if (error) {
      toast.error(`Failed to revoke approval: ${error.message}`);
    } else {
      toast.success(`Approval revoked. Event status reset to ${statusToRevertTo.replace(/_/g, ' ').toUpperCase()}.`);
      onRevokeSuccess();
    }
    setIsSubmitting(false);
  };

  const eventDate = new Date(event.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const canRevoke = eventDate > today;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke Approval: {event.title}</DialogTitle>
          <DialogDescription>
            You are about to revoke your approval for this event. This action will reset the event status to the previous pending stage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-2">
            <p><strong>Event Date:</strong> {format(eventDate, 'PPP')}</p>
            <p><strong>Current Status:</strong> {event.status.replace(/_/g, ' ').toUpperCase()}</p>
            
            {!canRevoke && (
                <p className="text-red-600 font-medium mt-4">
                    Revocation is not allowed on or after the event date.
                </p>
            )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleRevoke}
            disabled={isSubmitting || !canRevoke}
          >
            {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevokeApprovalDialog;