import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, List, Calendar } from 'lucide-react';
import EventDialog from '@/components/EventDialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCalendar from '@/components/EventCalendar';

const statusColors = {
  pending_hod: 'bg-yellow-500',
  returned_to_coordinator: 'bg-orange-500',
  pending_dean: 'bg-yellow-600',
  returned_to_hod: 'bg-orange-600',
  pending_principal: 'bg-yellow-700',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const CoordinatorDashboard = () => {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch user's events
    const { data: myEventsData, error: myEventsError } = await supabase
      .from('events')
      .select('*, venues(name)')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false });

    if (myEventsError) console.error('Error fetching my events:', myEventsError);
    else setMyEvents(myEventsData);

    // Fetch all approved events for the calendar
    const { data: approvedEventsData, error: approvedEventsError } = await supabase
      .from('events')
      .select('*, venues(name)')
      .eq('status', 'approved');

    if (approvedEventsError) console.error('Error fetching approved events:', approvedEventsError);
    else setApprovedEvents(approvedEventsData);

    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleCreate = () => {
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: any) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleSuccess = () => {
    fetchEvents();
    handleDialogClose();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Coordinator Dashboard</h2>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Event
        </Button>
      </div>

      <EventDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
        event={selectedEvent}
      />

      <Tabs defaultValue="my-events">
        <TabsList className="mb-4">
          <TabsTrigger value="my-events">
            <List className="w-4 h-4 mr-2" />
            My Events
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Approved Events Calendar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-events">
          <div className="bg-white rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : myEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No events found.</TableCell>
                  </TableRow>
                ) : (
                  myEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.venues?.name || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[event.status as keyof typeof statusColors]} text-white`}>
                          {event.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {event.status === 'returned_to_coordinator' && (
                          <Button variant="outline" size="sm" onClick={() => handleEdit(event)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          {loading ? (
            <div className="text-center p-8">Loading calendar...</div>
          ) : (
            <EventCalendar events={approvedEvents} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoordinatorDashboard;