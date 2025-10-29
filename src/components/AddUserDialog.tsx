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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'teacher', 'hod', 'dean', 'principal']),
  department: z.string().optional(),
});

type Department = {
  id: string;
  name: string;
  degree: string;
};

type AddUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const AddUserDialog = ({ isOpen, onClose, onSuccess }: AddUserDialogProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      department: '',
    },
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) toast.error('Failed to fetch departments.');
      else setDepartments(data);
    };
    fetchDepartments();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-users', {
        body: values,
      });

      if (error) throw error;

      const result = data.results[0];
      if (result.success) {
        toast.success(`User ${result.email} created successfully.`);
        onSuccess();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(`Failed to create user: ${error.message}`);
    }
  };

  const showDepartmentField = form.watch('role') === 'teacher' || form.watch('role') === 'hod';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign their role.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="hod">HOD</SelectItem><SelectItem value="dean">Dean</SelectItem><SelectItem value="principal">Principal</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            {showDepartmentField && (
              <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={`${dept.name} (${dept.degree})`}>{dept.name} ({dept.degree})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;