import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DepartmentDialog from '@/components/DepartmentDialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Profile } from '@/contexts/AuthContext';

type Department = {
  id: string;
  name: string;
  degree: 'B.E' | 'B.Tech' | 'MCA' | 'MBA';
};

type DepartmentDetails = Department & {
  hod: Profile | null;
  coordinators: Profile[];
};

const ManageDepartments = () => {
  const [departments, setDepartments] = useState<DepartmentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    
    const { data: departmentsData, error: departmentsError } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (departmentsError) {
      toast.error('Failed to fetch departments.');
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, department')
      .in('role', ['hod', 'coordinator']);

    if (profilesError) {
      toast.error('Failed to fetch user roles.');
      setLoading(false);
      return;
    }

    const departmentsWithDetails = departmentsData.map(dept => {
      const departmentIdentifier = `${dept.name} (${dept.degree})`;

      const hod = profilesData.find(p => p.role === 'hod' && p.department === departmentIdentifier) || null;
      const coordinators = profilesData.filter(p => p.role === 'coordinator' && p.department === departmentIdentifier);

      return {
        ...dept,
        hod,
        coordinators,
      };
    });

    setDepartments(departmentsWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = () => {
    setSelectedDepartment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setIsDialogOpen(true);
  };

  const handleDelete = async (departmentId: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', departmentId);
    if (error) {
      toast.error(`Failed to delete department: ${error.message}`);
    } else {
      toast.success('Department deleted successfully.');
      fetchDepartments();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Departments</h2>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      <DepartmentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchDepartments}
        department={selectedDepartment}
      />

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Degree</TableHead>
              <TableHead>HOD</TableHead>
              <TableHead>Coordinators</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No departments found.</TableCell>
              </TableRow>
            ) : (
              departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{department.degree}</Badge>
                  </TableCell>
                  <TableCell>
                    {department.hod ? `${department.hod.first_name} ${department.hod.last_name}` : <span className="text-muted-foreground">Not Assigned</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          {department.coordinators.length} {department.coordinators.length === 1 ? 'Coordinator' : 'Coordinators'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {department.coordinators.length > 0 ? (
                          department.coordinators.map(c => (
                            <DropdownMenuItem key={c.id}>
                              {c.first_name} {c.last_name}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No coordinators assigned</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(department)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the department.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(department.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

export default ManageDepartments;