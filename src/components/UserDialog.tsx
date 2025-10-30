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
  department: z.string().optional().nullable(),
  club: z.string().optional().nullable(),
  professional_society: z.string().optional().nullable(),
});

type Department = { id: string; name: string; degree: string; };
type Club = { id: string; name: string; };
type ProfessionalSociety = { id: string; name: string; };

type UserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: Profile | null;
};

const UserDialog = ({ isOpen, onClose, onSuccess, user }: UserDialogProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [societies, setSocieties] = useState<ProfessionalSociety[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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

  useEffect(() => {
    if (user) {
      form.reset({
        role: user.role,
        department: user.department || '--none--',
        club: user.club || '--none--',
        professional_society: user.professional_society || '--none--',
      });
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    const updateData = {
      ...values,
      department: (values.role === 'coordinator' || values.role === 'hod') 
        ? (values.department === '--none--' ? null : values.department) 
        : null,
      club: values.role === 'coordinator' 
        ? (values.club === '--none--' ? null : values.club) 
        : null,
      professional_society: values.role === 'coordinator'
        ? (values.professional_society === '--none--' ? null : values.professional_society)
        : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.first_name} {user.last_name}</DialogTitle>
          <DialogDescription>Update the role and assignments for this user.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="coordinator">Coordinator</SelectItem><SelectItem value="hod">HOD</SelectItem><SelectItem value="dean">Dean</SelectItem><SelectItem value="principal">Principal</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            
            {showDepartmentField && (
              <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} value={field.value || '--none--'}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{!isClubSelected && !isSocietySelected && <SelectItem value="--none--">None</SelectItem>}{departments.map((dept) => (<SelectItem key={dept.id} value={`${dept.name} (${dept.degree})`}>{dept.name} ({dept.degree})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            {showClubField && (
              <FormField control={form.control} name="club" render={({ field }) => (<FormItem><FormLabel>Club</FormLabel><Select onValueChange={field.onChange} value={field.value || '--none--'}><FormControl><SelectTrigger><SelectValue placeholder="Select a club" /></SelectTrigger></FormControl><SelectContent>{!isDepartmentSelected && !isSocietySelected && <SelectItem value="--none--">None</SelectItem>}{clubs.map((club) => (<SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            {showSocietyField && (
              <FormField control={form.control} name="professional_society" render={({ field }) => (<FormItem><FormLabel>Professional Society</FormLabel><Select onValueChange={field.onChange} value={field.value || '--none--'}><FormControl><SelectTrigger><SelectValue placeholder="Select a society" /></SelectTrigger></FormControl><SelectContent>{!isDepartmentSelected && !isClubSelected && <SelectItem value="--none--">None</SelectItem>}{societies.map((society) => (<SelectItem key={society.id} value={society.name}>{society.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
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