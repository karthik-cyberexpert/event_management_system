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
import ProfessionalSocietyDialog from '@/components/ProfessionalSocietyDialog';
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';

type ProfessionalSociety = {
  id: string;
  name: string;
};

type SocietyDetails = ProfessionalSociety & {
  coordinators: Profile[];
};

const ManageProfessionalSocieties = () => {
  const [societies, setSocieties] = useState<SocietyDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<ProfessionalSociety | null>(null);

  const fetchSocieties = async () => {
    setLoading(true);
    
    const { data: societiesData, error: societiesError } = await supabase
      .from('professional_societies')
      .select('*')
      .order('name', { ascending: true });

    if (societiesError) {
      toast.error('Failed to fetch professional societies.');
      setLoading(false);
      return;
    }
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, professional_society')
      .eq('role', 'coordinator');

    if (profilesError) {
      toast.error('Failed to fetch coordinator roles.');
      setLoading(false);
      return;
    }

    const societiesWithDetails = societiesData.map(society => {
      const coordinators = profilesData.filter(p => p.professional_society === society.name);

      return {
        ...society,
        coordinators,
      };
    });

    setSocieties(societiesWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const handleAdd = () => {
    setSelectedSociety(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (society: ProfessionalSociety) => {
    setSelectedSociety(society);
    setIsDialogOpen(true);
  };

  const handleDelete = async (societyId: string) => {
    const { error } = await supabase.from('professional_societies').delete().eq('id', societyId);
    if (error) {
      toast.error(`Failed to delete society: ${error.message}`);
    } else {
      toast.success('Professional society deleted successfully.');
      fetchSocieties();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Professional Societies</h2>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Society
        </Button>
      </div>

      <ProfessionalSocietyDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchSocieties}
        society={selectedSociety}
      />

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Coordinators</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : societies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No professional societies found.</TableCell>
              </TableRow>
            ) : (
              societies.map((society) => (
                <TableRow key={society.id}>
                  <TableCell className="font-medium">{society.name}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          {society.coordinators?.length || 0} { (society.coordinators?.length || 0) === 1 ? 'Coordinator' : 'Coordinators'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(society.coordinators?.length || 0) > 0 ? (
                          society.coordinators.map(c => (
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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(society)}>
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
                            This action cannot be undone. This will permanently delete the professional society.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(society.id)}>
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

export default ManageProfessionalSocieties;