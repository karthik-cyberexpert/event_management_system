import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  venue_id: z.string().min(1, 'Venue is required'),
  event_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  expected_audience: z.coerce.number().int().positive().optional(),
}).refine(data => data.end_time > data.start_time, {
  message: "End time must be after start time",
  path: ["end_time"],
});

type Venue = {
  id: string;
  name: string;
};

type EventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: any | null;
};

const EventDialog = ({ isOpen, onClose, onSuccess, event }: EventDialogProps) => {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!event;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const fetchVenues = async () => {
      const { data, error } = await supabase.from('venues').select('id, name');
      if (error) {
        toast.error('Failed to fetch venues.');
      } else {
        setVenues(data);
      }
    };
    fetchVenues();
  }, []);

  useEffect(() => {
    if (event) {
      form.reset({
        ...event,
        expected_audience: event.expected_audience || undefined,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        venue_id: '',
        event_date: '',
        start_time: '',
        end_time: '',
        expected_audience: undefined,
      });
    }
  }, [event, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setIsSubmitting(true);

    // Check venue availability, excluding the current event if in edit mode
    const { data: isAvailable, error: checkError } = await supabase.rpc('check_venue_availability', {
      p_venue_id: values.venue_id,
      p_event_date: values.event_date,
      p_start_time: values.start_time,
      p_end_time: values.end_time,
      p_event_id: isEditMode ? event.id : null,
    });

    if (checkError || !isAvailable) {
      toast.error('Venue is not available at the selected date and time.');
      setIsSubmitting(false);
      return;
    }

    let error;
    if (isEditMode) {
      // Update existing event and reset status for re-approval
      const { error: updateError } = await supabase
        .from('events')
        .update({ ...values, status: 'pending_hod', remarks: null })
        .eq('id', event.id);
      error = updateError;
    } else {
      // Insert new event
      const { error: insertError } = await supabase.from('events').insert({
        ...values,
        submitted_by: user.id,
      });
      error = insertError;
    }

    if (error) {
      toast.error(`Failed to save event: ${error.message}`);
    } else {
      toast.success(`Event ${isEditMode ? 'updated and resubmitted' : 'created'} successfully.`);
      onSuccess();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          {isEditMode && <DialogDescription>Make changes and resubmit for approval.</DialogDescription>}
        </DialogHeader>

        {isEditMode && event.remarks && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Approver Remarks</AlertTitle>
            <AlertDescription>{event.remarks}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields remain the same */}
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Event Title" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Event Description" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="venue_id" render={({ field }) => (<FormItem><FormLabel>Venue</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a venue" /></SelectTrigger></FormControl><SelectContent>{venues.map((venue) => (<SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="event_date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_time" render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="end_time" render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="expected_audience" render={({ field }) => (<FormItem><FormLabel>Expected Audience</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update & Resubmit' : 'Submit for Approval')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;