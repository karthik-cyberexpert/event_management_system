import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, List, Calendar, MoreHorizontal, XCircle, Download } from 'lucide-react';
import EventDialog from '@/components/EventDialog';
import EventCancelDialog from '@/components/EventCancelDialog';
import EventReportDialog from '@/components/EventReportDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCalendar from '@/components/EventCalendar';

const statusColors = {
  pending_hod: 'bg-primary',
  resubmitted: 'bg-indigo-500', // New color for resubmitted
  returned_to_coordinator: 'bg-secondary',
  pending_dean: 'bg-accent',
  returned_to_hod: 'bg-muted',
  pending_principal: 'bg-primary/80',
  approved: 'bg-green-500',
  rejected: 'bg-destructive',
  cancelled: 'bg-gray-500',
};

const CoordinatorDashboard = () => {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false); // New state
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch user's events
    const { data: myEventsData, error: myEventsError } = await supabase
      .from('events')
      .select(`
        *, 
        venues(name),
        submitted_by:profiles ( first_name, last_name )
      `)
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false });

    if (myEventsError) console.error('Error fetching my events:', myEventsError);
    else {
      const mappedData = myEventsData.map(event => ({
        ...event,
        profiles: event.submitted_by, // Map submitted_by object to 'profiles' for consistency if needed elsewhere
      }));
      setMyEvents(mappedData);
    }

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
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  const handleEdit = (event: any) => {
    setSelectedEvent(event);
    setDialogMode('edit');
    setIsDialogOpen(true);
  };
  
  const handleView = (event: any) => {
    setSelectedEvent(event);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleCancel = (event: any) => {
    setSelectedEvent(event);
    setIsCancelDialogOpen(true);
  };
  
  const handleReport = (event: any) => {
    setSelectedEvent(event);
    setIsReportDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleCancelDialogClose = () => {
    setIsCancelDialogOpen(false);
    setSelectedEvent(null);
  };
  
  const handleReportDialogClose = () => {
    setIsReportDialogOpen(false);
    setSelectedEvent(null);
  };

  // Make handleSuccess async and await fetchEvents to ensure the list is updated before proceeding.
  const handleSuccess = async () => {
    await fetchEvents();
    handleDialogClose();
  };
  
  const handleCancelSuccess = () => {
    // Ensure state is cleared and events are fetched immediately
    fetchEvents();
    handleCancelDialogClose();
  };

  const isCancellable = (status: string) => {
    // Allow cancellation if not already rejected or cancelled
    return status !== 'rejected' && status !== 'cancelled';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-primary">Coordinator Dashboard</h2>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Create Event
        </Button>
      </div>

      <EventDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleSuccess}
        event={selectedEvent}
        mode={dialogMode}
      />
      
      {selectedEvent && (
        <>
          <EventCancelDialog
            isOpen={isCancelDialogOpen}
            onClose={handleCancelDialogClose}
            onCancelSuccess={handleCancelSuccess}
            event={selectedEvent}
          />
          <EventReportDialog
            isOpen={isReportDialogOpen}
            onClose={handleReportDialogClose}
            event={selectedEvent}
          />
        </>
      )}

      <Tabs defaultValue="my-events">
        <TabsList className="mb-4 bg-muted p-1 rounded-lg">
          <TabsTrigger value="my-events" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <List className="w-4 h-4 mr-2" />
            My Events
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            Approved Events Calendar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-events">
          <div className="bg-card rounded-lg shadow border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="text-foreground font-semibold">Title</TableHead>
                  <TableHead className="text-foreground font-semibold">Venue</TableHead>
                  <TableHead className="text-foreground font-semibold">Date</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold text-right">Actions</TableHead>
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
                      <TableCell>{event.venues?.name || event.other_venue_details || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[event.status as keyof typeof statusColors]} text-primary-foreground`}>
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
                            <DropdownMenuItem onClick={() => handleView(event)}>
                              View
                            </DropdownMenuItem>
                            {event.status === 'returned_to_coordinator' && (
                              <DropdownMenuItem onClick={() => handleEdit(event)}>
                                Edit
                              </DropdownMenuItem>
                            )}
                            {event.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handleReport(event)}>
                                <Download className="mr-2 h-4 w-4" /> Download Report
                              </DropdownMenuItem>
                            )}
                            {isCancellable(event.status) && (
                              <DropdownMenuItem 
                                onClick={() => handleCancel(event)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel Event
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