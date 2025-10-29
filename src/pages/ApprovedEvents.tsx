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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const ApprovedEvents = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApprovedEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          start_time,
          end_time,
          venues ( name ),
          profiles:submitted_by ( first_name, last_name )
        `)
        .eq('status', 'approved')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching approved events:', error);
      } else {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchApprovedEvents();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Approved Events Schedule</h2>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Organizer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading events...</TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No approved events found.</TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                    <TableCell>{event.start_time} - {event.end_time}</TableCell>
                    <TableCell>{event.venues?.name || 'N/A'}</TableCell>
                    <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovedEvents;