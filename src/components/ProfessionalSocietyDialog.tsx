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
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Society name is required'),
});

type ProfessionalSociety = {
  id: string;
  name: string;
};

type ProfessionalSocietyDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  society?: ProfessionalSociety | null;
};

const ProfessionalSocietyDialog = ({ isOpen, onClose, onSuccess, society }: ProfessionalSocietyDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (society) {
      form.reset({ name: society.name });
    } else {
      form.reset({ name: '' });
    }
  }, [society, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let error;
    if (society) {
      // Update existing society
      const { error: updateError } = await supabase
        .from('professional_societies')
        .update(values)
        .eq('id', society.id);
      error = updateError;
    } else {
      // Create new society
      const { error: insertError } = await supabase.from('professional_societies').insert(values);
      error = insertError;
    }

    if (error) {
      toast.error(`Failed to save society: ${error.message}`);
    } else {
      toast.success(`Society ${society ? 'updated' : 'created'} successfully.`);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{society ? 'Edit Professional Society' : 'Add New Professional Society'}</DialogTitle>
          <DialogDescription>
            {society ? 'Update the details for this society.' : 'Enter the details for the new society.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Society Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., IEEE" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Society'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfessionalSocietyDialog;