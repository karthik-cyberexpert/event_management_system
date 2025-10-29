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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import EventCalendar from '@/components/EventCalendar';
import { List, Calendar } from 'lucide-react';

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
          submitted_by:profiles ( first_name, last_name )
        `)
        .eq('status', 'approved')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching approved events:', error);
      } else {
        const mappedData = data.map(event => ({
          ...event,
          profiles: event.submitted_by,
        }));
        setEvents(mappedData);
      }
      setLoading(false);
    };

    fetchApprovedEvents();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Approved Events Schedule</h2>
      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">
            <List className="w-4 h-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
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
        </TabsContent>
        <TabsContent value="calendar">
          {loading ? (
            <div className="text-center p-8">Loading calendar...</div>
          ) : (
            <EventCalendar events={events} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApprovedEvents;