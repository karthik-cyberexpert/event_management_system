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
import { format } from 'date-fns';
import { toast } from 'sonner';

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

  useEffect(() => {
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

      // Filter based on the user's role
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : approvedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">You have not approved any events yet.</TableCell>
              </TableRow>
            ) : (
              approvedEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                  <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                  <TableCell>{getApprovalDate(event)}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[event.status]} text-white`}>
                      {event.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
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

export default MyApprovals;