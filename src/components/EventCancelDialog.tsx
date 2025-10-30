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

const formSchema = z.object({
  cancellation_reason: z.string().min(10, 'Cancellation reason must be at least 10 characters.'),
});

type EventCancelDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess: () => void;
};

const EventCancelDialog = ({ event, isOpen, onClose, onCancelSuccess }: EventCancelDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { cancellation_reason: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    // Use 'cancelled' status and store the reason in remarks
    const { error } = await supabase
      .from('events')
      .update({ 
        status: 'cancelled', 
        remarks: `CANCELLATION REASON: ${values.cancellation_reason}`,
      })
      .eq('id', event.id);

    if (error) {
      toast.error(`Failed to cancel event: ${error.message}`);
    } else {
      toast.success(`Event "${event.title}" has been successfully canceled.`);
      onCancelSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Event: {event.title}</DialogTitle>
          <DialogDescription>
            Please provide a detailed reason for canceling this event. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="cancellation_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Cancellation</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Venue conflict, speaker unavailability, low registration..." 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Keep Event
              </Button>
              <Button 
                type="submit" 
                variant="destructive" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Canceling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EventCancelDialog;