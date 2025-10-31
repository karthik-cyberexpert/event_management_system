import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Edit, PlusCircle, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import UserDialog from '@/components/UserDialog';
import AddUserDialog from '@/components/AddUserDialog';
import BulkUserUploadDialog from '@/components/BulkUserUploadDialog';
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';

type UserWithEmail = Profile & {
  email: string;
};

const ALL_ROLES = ['coordinator', 'hod', 'dean', 'principal', 'admin'] as const;
type Role = typeof ALL_ROLES[number];
type CoordinatorFilter = 'department' | 'club' | 'society';

const ManageUsers = () => {
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  const [activeRole, setActiveRole] = useState<Role>('coordinator');
  const [coordinatorFilter, setCoordinatorFilter] = useState<CoordinatorFilter>('department');

  const fetchUsers = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-fetch-users');
      if (error) throw error;
      setUsers(data as UserWithEmail[]);
    } catch (error: any) {
      toast.error(`Failed to fetch users: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: Profile) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const filteredUsers = useMemo(() => {
    const roleFiltered = users.filter(user => user.role === activeRole);

    if (activeRole === 'coordinator') {
      if (coordinatorFilter === 'department') return roleFiltered.filter(user => user.department);
      if (coordinatorFilter === 'club') return roleFiltered.filter(user => user.club);
      if (coordinatorFilter === 'society') return roleFiltered.filter(user => user.professional_society);
    }
    
    return roleFiltered;
  }, [users, activeRole, coordinatorFilter]);

  const getAssignmentValue = (user: UserWithEmail) => {
    if (user.role === 'coordinator') {
      if (coordinatorFilter === 'department') return user.department || 'N/A';
      if (coordinatorFilter === 'club') return user.club || 'N/A';
      if (coordinatorFilter === 'society') return user.professional_society || 'N/A';
    }
    if (user.role === 'hod') return user.department || 'N/A';
    return 'N/A';
  };

  const getAssignmentHeader = () => {
    if (activeRole === 'coordinator') {
      if (coordinatorFilter === 'department') return 'Department';
      if (coordinatorFilter === 'club') return 'Club';
      if (coordinatorFilter === 'society') return 'Professional Society';
    }
    if (activeRole === 'hod') return 'Department';
    return 'Assignment';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Users</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Bulk Upload
          </Button>
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <UserDialog isOpen={isUserDialogOpen} onClose={() => setIsUserDialogOpen(false)} onSuccess={fetchUsers} user={selectedUser} />
      <AddUserDialog isOpen={isAddUserDialogOpen} onClose={() => setIsAddUserDialogOpen(false)} onSuccess={fetchUsers} />
      <BulkUserUploadDialog isOpen={isBulkUploadDialogOpen} onClose={() => setIsBulkUploadDialogOpen(false)} onSuccess={fetchUsers} />

      <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as Role)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {ALL_ROLES.map(role => (<TabsTrigger key={role} value={role} className="capitalize">{role}s</TabsTrigger>))}
        </TabsList>

        {ALL_ROLES.map(role => (
          <TabsContent key={role} value={role} className="mt-4">
            {role === 'coordinator' && (
              <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded-lg shadow">
                <Label className="font-semibold">Coordinator Type:</Label>
                <RadioGroup value={coordinatorFilter} onValueChange={(value: CoordinatorFilter) => setCoordinatorFilter(value)} className="flex space-x-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="department" id="r1" /><Label htmlFor="r1">Department</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="club" id="r2" /><Label htmlFor="r2">Club</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="society" id="r3" /><Label htmlFor="r3">Professional Society</Label></div>
                </RadioGroup>
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>{getAssignmentHeader()}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center">No {role}s found for this filter.</TableCell></TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getAssignmentValue(user)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}><Edit className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ManageUsers;