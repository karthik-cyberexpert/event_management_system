import { useEffect } from 'react';
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
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  capacity: z.coerce.number().int().positive('Capacity must be a positive number').optional(),
  location: z.string().optional(),
});

type Venue = {
  id: string;
  name: string;
  capacity?: number;
  location?: string;
};

type VenueDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  venue?: Venue | null;
};

const VenueDialog = ({ isOpen, onClose, onSuccess, venue }: VenueDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (venue) {
      form.reset({
        name: venue.name,
        capacity: venue.capacity,
        location: venue.location,
      });
    } else {
      form.reset({
        name: '',
        capacity: undefined,
        location: '',
      });
    }
  }, [venue, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let error;
    if (venue) {
      // Update existing venue
      const { error: updateError } = await supabase
        .from('venues')
        .update(values)
        .eq('id', venue.id);
      error = updateError;
    } else {
      // Create new venue
      const { error: insertError } = await supabase.from('venues').insert(values);
      error = insertError;
    }

    if (error) {
      toast.error(`Failed to save venue: ${error.message}`);
    } else {
      toast.success(`Venue ${venue ? 'updated' : 'created'} successfully.`);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{venue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Auditorium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Building, 1st Floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Venue'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default VenueDialog;