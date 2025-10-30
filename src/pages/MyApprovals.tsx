import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Undo2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EventDialog from '@/components/EventDialog';
import RevokeApprovalDialog from '@/components/RevokeApprovalDialog';

const statusColors: { [key: string]: string } = {
  pending_hod: 'bg-yellow-500',
  returned_to_coordinator: 'bg-orange-500',
  pending_dean: 'bg-yellow-600',
  returned_to_hod: 'bg-orange-600',
  pending_principal: 'bg-yellow-700',
  returned_to_dean: 'bg-orange-700',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const MyApprovals = () => {
  const { profile } = useAuth();
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchApprovedEvents = async () => {
    if (!profile || !['hod', 'dean', 'principal'].includes(profile.role)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    let query = supabase
      .from('events')
      .select(`
        *,
        venues ( name ),
        submitted_by:profiles ( first_name, last_name )
      `);

    // Filter based on the user's role (only show events they have approved)
    if (profile.role === 'hod') {
      query = query.not('hod_approval_at', 'is', null);
    } else if (profile.role === 'dean') {
      query = query.not('dean_approval_at', 'is', null);
    } else if (profile.role === 'principal') {
      query = query.not('principal_approval_at', 'is', null);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to fetch your approved events.');
      console.error(error);
    } else {
      const mappedData = data.map(event => ({
        ...event,
        profiles: event.submitted_by,
      }));
      setApprovedEvents(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApprovedEvents();
  }, [profile]);

  const getApprovalDate = (event: any) => {
    if (!profile) return 'N/A';
    switch (profile.role) {
      case 'hod':
        return event.hod_approval_at ? format(new Date(event.hod_approval_at), 'PPP p') : 'N/A';
      case 'dean':
        return event.dean_approval_at ? format(new Date(event.dean_approval_at), 'PPP p') : 'N/A';
      case 'principal':
        return event.principal_approval_at ? format(new Date(event.principal_approval_at), 'PPP p') : 'N/A';
      default:
        return 'N/A';
    }
  };
  
  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  };

  const handleRevokeClick = (event: any) => {
    setSelectedEvent(event);
    setIsRevokeDialogOpen(true);
  };

  const handleActionSuccess = () => {
    fetchApprovedEvents();
    setIsRevokeDialogOpen(false);
    setSelectedEvent(null);
  };

  const isRevokable = (event: any) => {
    const eventDate = new Date(event.event_date);
    // Revocation is allowed only BEFORE the event date starts.
    // isPast(eventDate) returns true if the date is in the past.
    // isToday(eventDate) returns true if the date is today.
    return !isPast(eventDate) && !isToday(eventDate);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">My Approved Events</h2>
      
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Event Date</TableHead>
              <TableHead>Approved On</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : approvedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">You have not approved any events yet.</TableCell>
              </TableRow>
            ) : (
              approvedEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                  <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                  <TableCell>{getApprovalDate(event)}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[event.status as keyof typeof statusColors]} text-white`}>
                      {event.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(event)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        {isRevokable(event) && (
                          <DropdownMenuItem 
                            onClick={() => handleRevokeClick(event)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Undo2 className="mr-2 h-4 w-4" /> Revoke Approval
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedEvent && (
        <>
          <EventDialog
            isOpen={isViewDialogOpen}
            onClose={() => setIsViewDialogOpen(false)}
            onSuccess={() => { /* No action needed on view close */ }}
            event={selectedEvent}
            mode="view"
          />
          <RevokeApprovalDialog
            isOpen={isRevokeDialogOpen}
            onClose={() => setIsRevokeDialogOpen(false)}
            onRevokeSuccess={handleActionSuccess}
            event={selectedEvent}
            role={profile!.role as 'hod' | 'dean' | 'principal'}
          />
        </>
      )}
    </div>
  );
};

export default MyApprovals;