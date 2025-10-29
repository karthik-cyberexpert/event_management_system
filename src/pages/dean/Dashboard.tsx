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

const statusColors = {
  pending_dean: 'bg-yellow-600',
  returned_to_dean: 'bg-orange-700',
};

const DeanDashboard = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venues ( name ),
        profiles ( first_name, last_name )
      `)
      .in('status', ['pending_dean', 'returned_to_dean'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data);
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

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Pending Event Approvals</h2>
      
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
                <TableCell colSpan={6} className="text-center">No pending events found.</TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                  <TableCell>{event.venues?.name || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[event.status as keyof typeof statusColors]} text-white`}>
                      {event.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelectedEvent(event)}>
                      Review
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
          role="dean"
        />
      )}
    </div>
  );
};

export default DeanDashboard;