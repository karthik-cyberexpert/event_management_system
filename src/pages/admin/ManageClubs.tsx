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
import ClubDialog from '@/components/ClubDialog';
import { toast } from 'sonner';
import { Profile } from '@/contexts/AuthContext';

type Club = {
  id: string;
  name: string;
};

type ClubDetails = Club & {
  coordinators: Profile[];
};

const ManageClubs = () => {
  const [clubs, setClubs] = useState<ClubDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const fetchClubs = async () => {
    setLoading(true);
    
    const { data: clubsData, error: clubsError } = await supabase
      .from('clubs')
      .select('*')
      .order('name', { ascending: true });

    if (clubsError) {
      toast.error('Failed to fetch clubs.');
      setLoading(false);
      return;
    }
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, club')
      .eq('role', 'coordinator');

    if (profilesError) {
      toast.error('Failed to fetch coordinator roles.');
      setLoading(false);
      return;
    }

    const clubsWithDetails = clubsData.map(club => {
      const coordinators = profilesData.filter(p => p.club === club.name);

      return {
        ...club,
        coordinators,
      };
    });

    setClubs(clubsWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleAdd = () => {
    setSelectedClub(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (club: Club) => {
    setSelectedClub(club);
    setIsDialogOpen(true);
  };

  const handleDelete = async (clubId: string) => {
    const { error } = await supabase.from('clubs').delete().eq('id', clubId);
    if (error) {
      toast.error(`Failed to delete club: ${error.message}`);
    } else {
      toast.success('Club deleted successfully.');
      fetchClubs();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Clubs</h2>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Club
        </Button>
      </div>

      <ClubDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={fetchClubs}
        club={selectedClub}
      />

      <div className="bg-card rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <TableHead className="text-primary-foreground">Name</TableHead>
              <TableHead className="text-primary-foreground">Coordinators</TableHead>
              <TableHead className="text-primary-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : clubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No clubs found.</TableCell>
              </TableRow>
            ) : (
              clubs.map((club) => (
                <TableRow key={club.id} className="bg-card hover:bg-accent transition-colors">
                  <TableCell className="font-medium">{club.name}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          {club.coordinators?.length || 0} { (club.coordinators?.length || 0) === 1 ? 'Coordinator' : 'Coordinators'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(club.coordinators?.length || 0) > 0 ? (
                          club.coordinators.map(c => (
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
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(club)}>
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
                            This action cannot be undone. This will permanently delete the club.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(club.id)}>
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

export default ManageClubs;