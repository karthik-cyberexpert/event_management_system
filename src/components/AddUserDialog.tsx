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
  role: z.enum(['admin', 'coordinator', 'hod', 'dean', 'principal']),
  department: z.string().optional(),
  club: z.string().optional(),
  professional_society: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'coordinator') {
    const isDepartmentSelected = data.department && data.department !== '--none--';
    const isClubSelected = data.club && data.club !== '--none--';
    const isSocietySelected = data.professional_society && data.professional_society !== '--none--';

    if (!isDepartmentSelected && !isClubSelected && !isSocietySelected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Coordinator must be assigned to a Department, Club, or Society.',
        path: ['department'], // Attach error to department field for visibility
      });
    }
  }
});

type Department = { id: string; name: string; degree: string; };
type Club = { id: string; name: string; };
type ProfessionalSociety = { id: string; name: string; };

type AddUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const AddUserDialog = ({ isOpen, onClose, onSuccess }: AddUserDialogProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [societies, setSocieties] = useState<ProfessionalSociety[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      department: '',
      club: '',
      professional_society: '',
    },
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: depts, error: deptsError } = await supabase.from('departments').select('*');
      if (deptsError) toast.error('Failed to fetch departments.'); else setDepartments(depts);

      const { data: clubsData, error: clubsError } = await supabase.from('clubs').select('*');
      if (clubsError) toast.error('Failed to fetch clubs.'); else setClubs(clubsData);

      const { data: societiesData, error: societiesError } = await supabase.from('professional_societies').select('*');
      if (societiesError) toast.error('Failed to fetch societies.'); else setSocieties(societiesData);
    };
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const submissionValues = {
        ...values,
        department: values.department === '--none--' ? null : values.department,
        club: values.club === '--none--' ? null : values.club,
        professional_society: values.professional_society === '--none--' ? null : values.professional_society,
      };

      const { data, error } = await supabase.functions.invoke('admin-create-users', {
        body: submissionValues,
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

  const role = form.watch('role');
  const departmentValue = form.watch('department');
  const clubValue = form.watch('club');
  const societyValue = form.watch('professional_society');

  const showDepartmentField = role === 'coordinator' || role === 'hod';
  const showClubField = role === 'coordinator';
  const showSocietyField = role === 'coordinator';
  
  const isDepartmentSelected = departmentValue && departmentValue !== '--none--';
  const isClubSelected = clubValue && clubValue !== '--none--';
  const isSocietySelected = societyValue && societyValue !== '--none--';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new user account and assign their role.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="coordinator">Coordinator</SelectItem><SelectItem value="hod">HOD</SelectItem><SelectItem value="dean">Dean</SelectItem><SelectItem value="principal">Principal</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            
            {showDepartmentField && (
              <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{!isClubSelected && !isSocietySelected && <SelectItem value="--none--">None</SelectItem>}{departments.map((dept) => (<SelectItem key={dept.id} value={`${dept.name} (${dept.degree})`}>{dept.name} ({dept.degree})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            {showClubField && (
              <FormField control={form.control} name="club" render={({ field }) => (<FormItem><FormLabel>Club</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a club" /></SelectTrigger></FormControl><SelectContent>{!isDepartmentSelected && !isSocietySelected && <SelectItem value="--none--">None</SelectItem>}{clubs.map((club) => (<SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            {showSocietyField && (
              <FormField control={form.control} name="professional_society" render={({ field }) => (<FormItem><FormLabel>Professional Society</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a society" /></SelectTrigger></FormControl><SelectContent>{!isDepartmentSelected && !isClubSelected && <SelectItem value="--none--">None</SelectItem>}{societies.map((society) => (<SelectItem key={society.id} value={society.name}>{society.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
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