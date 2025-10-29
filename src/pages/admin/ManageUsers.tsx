import { useState, useEffect } from 'react';
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
import UserDialog from '@/components/UserDialog';
import AddUserDialog from '@/components/AddUserDialog';
import BulkUserUploadDialog from '@/components/BulkUserUploadDialog';
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const ManageUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) {
      toast.error('Failed to fetch users.');
    } else {
      setUsers(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: Profile) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
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

      <UserDialog
        isOpen={isUserDialogOpen}
        onClose={() => setIsUserDialogOpen(false)}
        onSuccess={fetchUsers}
        user={selectedUser}
      />

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={() => setIsAddUserDialogOpen(false)}
        onSuccess={fetchUsers}
      />

      <BulkUserUploadDialog
        isOpen={isBulkUploadDialogOpen}
        onClose={() => setIsBulkUploadDialogOpen(false)}
        onSuccess={fetchUsers}
      />

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No users found.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{user.department || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageUsers;