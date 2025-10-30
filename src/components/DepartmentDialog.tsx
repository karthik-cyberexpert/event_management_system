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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Extend Profile type locally to include email for this admin view
type UserWithEmail = Profile & {
  email: string;
};

const formSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  degree: z.enum(['B.E', 'B.Tech', 'MCA', 'MBA']),
  // User assignment fields (IDs)
  hod_id: z.string().optional().nullable(),
  coordinator_ids: z.array(z.string()).optional(),
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
  allUsers: UserWithEmail[];
};

const DepartmentDialog = ({ isOpen, onClose, onSuccess, department, allUsers }: DepartmentDialogProps) => {
  const [currentHODId, setCurrentHODId] = useState<string | null>(null);
  const [currentCoordinatorIds, setCurrentCoordinatorIds] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: '', 
      degree: undefined,
      hod_id: null,
      coordinator_ids: [],
    },
  });

  const departmentIdentifier = department ? `${department.name} (${department.degree})` : null;
  
  // Filter users for HOD/Coordinator roles
  const potentialHODs = allUsers.filter(u => u.role !== 'hod' || u.department === departmentIdentifier);
  const potentialCoordinators = allUsers.filter(u => u.role !== 'coordinator' || u.department === departmentIdentifier);

  useEffect(() => {
    if (department) {
      form.reset({ name: department.name, degree: department.degree });
      
      // Find current assignments
      const currentHOD = allUsers.find(u => u.role === 'hod' && u.department === departmentIdentifier);
      const currentCoordinators = allUsers.filter(u => u.role === 'coordinator' && u.department === departmentIdentifier);
      
      const hodId = currentHOD?.id || null;
      const coordinatorIds = currentCoordinators.map(c => c.id);

      setCurrentHODId(hodId);
      setCurrentCoordinatorIds(coordinatorIds);

      form.reset({
        name: department.name,
        degree: department.degree,
        hod_id: hodId,
        coordinator_ids: coordinatorIds,
      });
    } else {
      form.reset({ name: '', degree: undefined, hod_id: null, coordinator_ids: [] });
      setCurrentHODId(null);
      setCurrentCoordinatorIds([]);
    }
  }, [department, form, allUsers]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const isNewDepartment = !department;
    let deptError;
    let deptId = department?.id;
    const newDepartmentIdentifier = `${values.name} (${values.degree})`;

    // 1. Create/Update Department
    if (isNewDepartment) {
      const { data, error } = await supabase.from('departments').insert(values).select('id').single();
      deptError = error;
      if (data) deptId = data.id;
    } else {
      const { error } = await supabase.from('departments').update({ name: values.name, degree: values.degree }).eq('id', department.id);
      deptError = error;
    }

    if (deptError) {
      toast.error(`Failed to save department: ${deptError.message}`);
      return;
    }

    // 2. Handle User Assignments (HOD and Coordinators)
    
    // Users whose roles/departments need to be cleared (unassigned)
    const usersToClear = allUsers.filter(u => 
      (u.role === 'hod' && u.department === departmentIdentifier && u.id !== values.hod_id) ||
      (u.role === 'coordinator' && u.department === departmentIdentifier && !values.coordinator_ids?.includes(u.id))
    );

    // Users whose roles/departments need to be set (assigned)
    const usersToAssign: { id: string, role: Profile['role'], department: string }[] = [];

    // HOD assignment
    if (values.hod_id && values.hod_id !== currentHODId) {
      usersToAssign.push({ id: values.hod_id, role: 'hod', department: newDepartmentIdentifier });
    }
    
    // Coordinator assignments
    const newCoordinatorIds = values.coordinator_ids || [];
    newCoordinatorIds.forEach(id => {
      if (!currentCoordinatorIds.includes(id)) {
        usersToAssign.push({ id, role: 'coordinator', department: newDepartmentIdentifier });
      }
    });

    // Execute profile updates
    const profileUpdates = [];

    // Clear old assignments
    for (const user of usersToClear) {
      profileUpdates.push(
        supabase.from('profiles').update({ 
          role: 'coordinator', // Default to coordinator if they were HOD, or keep coordinator if they were coordinator
          department: null 
        }).eq('id', user.id)
      );
    }
    
    // Set new assignments
    for (const user of usersToAssign) {
      profileUpdates.push(
        supabase.from('profiles').update({ 
          role: user.role, 
          department: user.department 
        }).eq('id', user.id)
      );
    }

    const profileResults = await Promise.all(profileUpdates);
    const profileError = profileResults.find(res => res.error)?.error;

    if (profileError) {
      toast.error(`Failed to update user roles: ${profileError.message}`);
    } else {
      toast.success(`Department ${isNewDepartment ? 'created' : 'updated'} successfully, and user roles assigned.`);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          <DialogDescription>
            {department ? 'Update the details and assign roles for this department.' : 'Enter the details for the new department and assign roles.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* HOD Assignment */}
            <FormField
              control={form.control}
              name="hod_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Head of Department (HOD)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === '--none--' ? null : value)} 
                    value={field.value || '--none--'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select HOD (Optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="--none--">-- Unassign HOD --</SelectItem>
                      {potentialHODs.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordinator Assignment (Multi-select using Checkboxes) */}
            <FormField
              control={form.control}
              name="coordinator_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Assign Coordinators (Multiple)</FormLabel>
                  <ScrollArea className="h-48 w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {potentialCoordinators.map((user) => (
                        <FormField
                          key={user.id}
                          control={form.control}
                          name="coordinator_ids"
                          render={({ field }) => {
                            const isChecked = field.value?.includes(user.id);
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value ?? [];
                                      return checked
                                        ? field.onChange([...currentValues, user.id])
                                        : field.onChange(currentValues.filter((value) => value !== user.id));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {user.first_name} {user.last_name} ({user.email})
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
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