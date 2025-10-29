import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';

const formSchema = z.object({
  role: z.enum(['admin', 'coordinator', 'hod', 'dean', 'principal']),
  department: z.string().optional(),
});

type Department = {
  id: string;
  name: string;
  degree: string;
};

type UserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: Profile | null;
};

const UserDialog = ({ isOpen, onClose, onSuccess, user }: UserDialogProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) {
        toast.error('Failed to fetch departments.');
      } else {
        setDepartments(data);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (user) {
      form.reset({
        role: user.role,
        department: user.department,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', user.id);

    if (error) {
      toast.error(`Failed to update user: ${error.message}`);
    } else {
      toast.success('User profile updated successfully.');
      onSuccess();
      onClose();
    }
  };

  if (!user) return null;

  const showDepartmentField = form.watch('role') === 'coordinator' || form.watch('role') === 'hod';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.first_name} {user.last_name}</DialogTitle>
          <DialogDescription>
            Update the role and department for this user.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                      <SelectItem value="hod">HOD</SelectItem>
                      <SelectItem value="dean">Dean</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showDepartmentField && (
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={`${dept.name} (${dept.degree})`}>
                            {dept.name} ({dept.degree})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;