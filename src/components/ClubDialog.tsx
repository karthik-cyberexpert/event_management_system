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
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Extend Profile type locally to include email for this admin view
type UserWithEmail = Profile & {
  email: string;
};

const formSchema = z.object({
  name: z.string().min(1, 'Club name is required'),
  coordinator_ids: z.array(z.string()).optional(),
});

type Club = {
  id: string;
  name: string;
};

type ClubDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  club?: Club | null;
  allUsers: UserWithEmail[];
};

const ClubDialog = ({ isOpen, onClose, onSuccess, club, allUsers }: ClubDialogProps) => {
  const [currentCoordinatorIds, setCurrentCoordinatorIds] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: '',
      coordinator_ids: [],
    },
  });

  const clubName = club?.name || null;
  
  // Filter users for Coordinator roles
  const potentialCoordinators = allUsers.filter(u => u.role !== 'coordinator' || u.club === clubName);

  useEffect(() => {
    if (club) {
      // Find current assignments
      const currentCoordinators = allUsers.filter(u => u.role === 'coordinator' && u.club === clubName);
      const coordinatorIds = currentCoordinators.map(c => c.id);

      setCurrentCoordinatorIds(coordinatorIds);

      form.reset({
        name: club.name,
        coordinator_ids: coordinatorIds,
      });
    } else {
      form.reset({ name: '', coordinator_ids: [] });
      setCurrentCoordinatorIds([]);
    }
  }, [club, form, allUsers]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const isNewClub = !club;
    let clubError;
    let clubId = club?.id;
    const newClubName = values.name;

    // 1. Create/Update Club
    if (isNewClub) {
      const { data, error } = await supabase.from('clubs').insert({ name: values.name }).select('id').single();
      clubError = error;
      if (data) clubId = data.id;
    } else {
      // If name changed, we need to update all profiles referencing the old name
      if (club.name !== values.name) {
        // Update profiles first to reference the new club name
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ club: values.name })
          .eq('club', club.name);
        
        if (profileUpdateError) {
          toast.error(`Failed to update associated profiles: ${profileUpdateError.message}`);
          return;
        }
      }
      
      const { error } = await supabase.from('clubs').update({ name: values.name }).eq('id', club.id);
      clubError = error;
    }

    if (clubError) {
      toast.error(`Failed to save club: ${clubError.message}`);
      return;
    }

    // 2. Handle Coordinator Assignments
    
    // Users whose roles/clubs need to be cleared (unassigned from this club)
    const usersToClear = allUsers.filter(u => 
      u.role === 'coordinator' && u.club === clubName && !values.coordinator_ids?.includes(u.id)
    );

    // Users whose roles/clubs need to be set (assigned to this club)
    const usersToAssign: { id: string, club: string }[] = [];

    const newCoordinatorIds = values.coordinator_ids || [];
    newCoordinatorIds.forEach(id => {
      if (!currentCoordinatorIds.includes(id)) {
        usersToAssign.push({ id, club: newClubName });
      }
    });

    // Execute profile updates
    const profileUpdates = [];

    // Clear old assignments (set club to null, keep role as coordinator)
    for (const user of usersToClear) {
      profileUpdates.push(
        supabase.from('profiles').update({ 
          club: null 
        }).eq('id', user.id)
      );
    }
    
    // Set new assignments (set role to coordinator, set club name)
    for (const user of usersToAssign) {
      profileUpdates.push(
        supabase.from('profiles').update({ 
          role: 'coordinator', 
          club: user.club 
        }).eq('id', user.id)
      );
    }

    const profileResults = await Promise.all(profileUpdates);
    const profileError = profileResults.find(res => res.error)?.error;

    if (profileError) {
      toast.error(`Failed to update user roles: ${profileError.message}`);
    } else {
      toast.success(`Club ${isNewClub ? 'created' : 'updated'} successfully, and coordinators assigned.`);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{club ? 'Edit Club' : 'Add New Club'}</DialogTitle>
          <DialogDescription>
            {club ? 'Update the details and assign coordinators for this club.' : 'Enter the details for the new club and assign coordinators.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Club Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Coding Club" {...field} />
                  </FormControl>
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Club'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClubDialog;