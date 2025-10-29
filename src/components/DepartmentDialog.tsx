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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  degree: z.enum(['B.E', 'B.Tech', 'MCA', 'MBA']),
});

type Department = {
  id: string;
  name: string;
  degree: 'B.E' | 'B.Tech' | 'MCA' | 'MBA';
};

type DepartmentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department?: Department | null;
};

const DepartmentDialog = ({ isOpen, onClose, onSuccess, department }: DepartmentDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (department) {
      form.reset({ name: department.name, degree: department.degree });
    } else {
      form.reset({ name: '', degree: undefined });
    }
  }, [department, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let error;
    if (department) {
      // Update existing department
      const { error: updateError } = await supabase
        .from('departments')
        .update(values)
        .eq('id', department.id);
      error = updateError;
    } else {
      // Create new department
      const { error: insertError } = await supabase.from('departments').insert(values);
      error = insertError;
    }

    if (error) {
      toast.error(`Failed to save department: ${error.message}`);
    } else {
      toast.success(`Department ${department ? 'updated' : 'created'} successfully.`);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          <DialogDescription>
            {department ? 'Update the details for this department.' : 'Enter the details for the new department.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="degree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Degree</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a degree" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="B.E">B.E</SelectItem>
                      <SelectItem value="B.Tech">B.Tech</SelectItem>
                      <SelectItem value="MCA">MCA</SelectItem>
                      <SelectItem value="MBA">MBA</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Department'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentDialog;