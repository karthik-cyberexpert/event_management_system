import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import EventCalendar from '@/components/EventCalendar';
import { List, Calendar, Search } from 'lucide-react';
import EventLookup from '@/components/EventLookup';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import EventActionDialog from '@/components/EventActionDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusColors: { [key: string]: string } = {
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

const ALL_STATUSES = [
  'pending_hod', 'returned_to_coordinator', 'pending_dean', 'returned_to_hod', 
  'pending_principal', 'returned_to_dean', 'approved', 'rejected', 'cancelled'
];

const AllEvents = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    // RLS ensures only events relevant to the user's role are returned.
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venues ( name, location ),
        submitted_by:profiles ( first_name, last_name )
      `)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      toast.error('Failed to fetch events.');
      console.error('Error fetching events:', error);
    } else {
      const mappedData = data.map(event => ({
        ...event,
        coordinator: event.submitted_by,
        profiles: event.submitted_by, // Keep profiles for consistency with EventActionDialog
      }));
      setEvents(mappedData);
      setApprovedEvents(mappedData.filter(e => e.status === 'approved'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesTitle = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCode = event.unique_code?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && (matchesTitle || matchesCode);
    });
  }, [events, statusFilter, searchTerm]);

  const handleActionSuccess = () => {
    fetchEvents();
    setSelectedEvent(null);
  };

  const isApprover = profile && ['hod', 'dean', 'principal'].includes(profile.role);
  const isReviewable = (event: any) => {
    if (!profile) return false;
    const role = profile.role;
    const status = event.status;
    
    if (role === 'hod' && (status === 'pending_hod' || status === 'returned_to_hod' || status === 'resubmitted')) return true;
    if (role === 'dean' && (status === 'pending_dean' || status === 'returned_to_dean')) return true;
    if (role === 'principal' && status === 'pending_principal') return true;
    
    return false;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Events Overview</h2>
      
      <EventLookup />

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">
            <List className="w-4 h-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Approved Calendar
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Viewable Events</CardTitle>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <Input
                  placeholder="Search by title or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_STATUSES.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dept/Club/Society</TableHead> {/* Updated Header */}
                    {isApprover && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={isApprover ? 7 : 6} className="text-center">Loading events...</TableCell>
                    </TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isApprover ? 7 : 6} className="text-center">No events match the criteria.</TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell className="font-mono text-xs">{event.unique_code || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                        <TableCell>{event.venues?.name || event.other_venue_details || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[event.status]} text-white capitalize`}>
                            {event.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default border-b border-dashed border-gray-400">
                                {event.department_club || 'N/A'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Submitted by: {event.coordinator?.first_name} {event.coordinator?.last_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        {isApprover && (
                          <TableCell>
                            {isReviewable(event) ? (
                              <Button variant="outline" size="sm" onClick={() => setSelectedEvent(event)}>
                                Review
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)} disabled={event.status === 'approved'}>
                                View
                              </Button>
                            )}
                          </TableCell>
                        )}
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
            <EventCalendar events={approvedEvents} />
          )}
        </TabsContent>
      </Tabs>
      
      {selectedEvent && isApprover && (
        <EventActionDialog
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onActionSuccess={handleActionSuccess}
          role={profile!.role as 'hod' | 'dean' | 'principal'}
        />
      )}
    </div>
  );
};

export default AllEvents;