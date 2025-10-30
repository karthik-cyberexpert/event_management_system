import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import EventActionDialog from '@/components/EventActionDialog';
import { toast } from 'sonner';

const statusColors = {
  pending_hod: 'bg-yellow-500',
  returned_to_coordinator: 'bg-orange-500',
  pending_dean: 'bg-yellow-600',
  returned_to_hod: 'bg-orange-600',
  pending_principal: 'bg-yellow-700',
  returned_to_dean: 'bg-orange-700',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const HodDashboard = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    // Fetch all events visible to the HOD based on RLS.
    // This includes pending_hod, returned_to_hod, and all events submitted by coordinators in their department.
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venues ( name ),
        submitted_by:profiles ( first_name, last_name )
      `)
      .order('created_at', { ascending: false }); // Show most recent events first

    if (error) {
      toast.error('Error fetching events for dashboard.');
      console.error('Error fetching events:', error);
    } else {
      // Map the data to use 'profiles' for consistency in rendering
      const mappedData = data.map(event => ({
        ...event,
        profiles: event.submitted_by,
      }));
      setEvents(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleActionSuccess = () => {
    fetchEvents();
    setSelectedEvent(null);
  };
  
  const isReviewable = (event: any) => {
    const status = event.status;
    return status === 'pending_hod' || status === 'returned_to_hod';
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Department Events Overview</h2>
      
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No relevant events found.</TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                  <TableCell>{event.venues?.name || event.other_venue_details || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[event.status as keyof typeof statusColors]} text-white capitalize`}>
                      {event.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant={isReviewable(event) ? 'outline' : 'ghost'} 
                      size="sm" 
                      onClick={() => setSelectedEvent(event)}
                    >
                      {isReviewable(event) ? 'Review' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedEvent && (
        <EventActionDialog
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onActionSuccess={handleActionSuccess}
          role="hod"
        />
      )}
    </div>
  );
};

export default HodDashboard;