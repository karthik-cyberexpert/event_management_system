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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import EventActionDialog from '@/components/EventActionDialog';
import EventReportDialog from '@/components/EventReportDialog';
import RevokeApprovalDialog from '@/components/RevokeApprovalDialog';
import { Download, Eye, Undo2 } from 'lucide-react';

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

type EventData = any;

const EventsOverview = () => {
  const { profile } = useAuth();
  const [allViewableEvents, setAllViewableEvents] = useState<EventData[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<EventData[]>([]);
  const [myApprovedEvents, setMyApprovedEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

  const isApprover = profile && ['hod', 'dean', 'principal'].includes(profile.role);

  const fetchEvents = async () => {
    setLoading(true);
    
    // 1. Fetch All Viewable Events (RLS filtered)
    const { data: allData, error: allError } = await supabase
      .from('events')
      .select(`
        *,
        venues ( name ),
        submitted_by:profiles ( first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (allError) {
      toast.error('Failed to fetch events overview.');
      setLoading(false);
      return;
    }
    
    const mappedAllData = allData.map(event => ({
      ...event,
      profiles: event.submitted_by,
    }));
    setAllViewableEvents(mappedAllData);

    // 2. Fetch All Approved Events (Public View)
    const { data: approvedData, error: approvedError } = await supabase
      .from('events')
      .select(`
        *,
        venues ( name ),
        submitted_by:profiles ( first_name, last_name )
      `)
      .eq('status', 'approved')
      .order('event_date', { ascending: true });

    if (approvedError) {
      console.error('Failed to fetch approved events:', approvedError);
    } else {
      setApprovedEvents(approvedData.map(event => ({
        ...event,
        profiles: event.submitted_by,
      })));
    }

    // 3. Fetch My Approved Events (Approver View)
    if (isApprover) {
      let query = supabase
        .from('events')
        .select(`
          *,
          venues ( name ),
          submitted_by:profiles ( first_name, last_name )
        `);

      if (profile.role === 'hod') {
        query = query.not('hod_approval_at', 'is', null);
      } else if (profile.role === 'dean') {
        query = query.not('dean_approval_at', 'is', null);
      } else if (profile.role === 'principal') {
        query = query.not('principal_approval_at', 'is', null);
      }

      const { data: myApprovedData, error: myApprovedError } = await query.order('created_at', { ascending: false });

      if (myApprovedError) {
        console.error('Failed to fetch my approved events:', myApprovedError);
      } else {
        setMyApprovedEvents(myApprovedData.map(event => ({
          ...event,
          profiles: event.submitted_by,
        })));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [profile]);

  const handleActionSuccess = () => {
    fetchEvents();
    setSelectedEvent(null);
    setIsActionDialogOpen(false);
    setIsRevokeDialogOpen(false);
  };

  const isReviewable = (event: EventData) => {
    if (!profile) return false;
    const role = profile.role;
    const status = event.status;
    
    if (role === 'hod' && (status === 'pending_hod' || status === 'returned_to_hod')) return true;
    if (role === 'dean' && (status === 'pending_dean' || status === 'returned_to_dean')) return true;
    if (role === 'principal' && status === 'pending_principal') return true;
    
    return false;
  };
  
  const isRevokable = (event: EventData) => {
    if (!profile || !isApprover) return false;
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if the event date is in the future
    const isFutureEvent = eventDate > today;

    // Check if the current user has approved it
    if (profile.role === 'hod' && event.hod_approval_at) return isFutureEvent;
    if (profile.role === 'dean' && event.dean_approval_at) return isFutureEvent;
    if (profile.role === 'principal' && event.principal_approval_at) return isFutureEvent;

    return false;
  };

  const getApprovalDate = (event: EventData) => {
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

  const getEventsForCurrentTab = () => {
    switch (activeTab) {
      case 'approved':
        return approvedEvents;
      case 'my-approved':
        return myApprovedEvents;
      case 'all':
      default:
        return allViewableEvents;
    }
  };

  const filteredEvents = useMemo(() => {
    const currentEvents = getEventsForCurrentTab();
    return currentEvents.filter(event => {
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [allViewableEvents, approvedEvents, myApprovedEvents, statusFilter, searchTerm, activeTab]);

  const handleViewDetails = (event: EventData) => {
    setSelectedEvent(event);
    setIsReportDialogOpen(true);
  };

  const handleRevokeClick = (event: EventData) => {
    setSelectedEvent(event);
    setIsRevokeDialogOpen(true);
  };

  const handleReviewClick = (event: EventData) => {
    setSelectedEvent(event);
    setIsActionDialogOpen(true);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Events Overview</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg shadow">
          <TabsList>
            <TabsTrigger value="all">All Viewable Events</TabsTrigger>
            <TabsTrigger value="approved">All Approved Events</TabsTrigger>
            {isApprover && <TabsTrigger value="my-approved">My Approved Events</TabsTrigger>}
          </TabsList>
          <div className="flex gap-4">
            <Input
              placeholder="Search by event title..."
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
                <SelectItem value="pending_hod">Pending HOD</SelectItem>
                <SelectItem value="pending_dean">Pending Dean</SelectItem>
                <SelectItem value="pending_principal">Pending Principal</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="returned_to_coordinator">Returned to Coordinator</SelectItem>
                <SelectItem value="returned_to_hod">Returned to HOD</SelectItem>
                <SelectItem value="returned_to_dean">Returned to Dean</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab}>
          <div className="bg-white rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No events match the criteria.</TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                      <TableCell>{event.venues?.name || event.other_venue_details || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[event.status]} text-white`}>
                          {event.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        {activeTab === 'my-approved' && <p className="text-xs text-muted-foreground mt-1">Approved: {getApprovalDate(event)}</p>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {isReviewable(event) && (
                          <Button variant="outline" size="sm" onClick={() => handleReviewClick(event)}>
                            Review
                          </Button>
                        )}
                        {event.status === 'approved' && (
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(event)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {activeTab === 'my-approved' && isRevokable(event) && (
                          <Button variant="ghost" size="icon" onClick={() => handleRevokeClick(event)} className="text-red-500 hover:text-red-600">
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                        {activeTab !== 'my-approved' && !isReviewable(event) && (
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(event)}>
                            <Eye className="h-4 w-4" />
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
      </Tabs>

      {selectedEvent && isApprover && isActionDialogOpen && (
        <EventActionDialog
          event={selectedEvent}
          isOpen={isActionDialogOpen}
          onClose={() => setIsActionDialogOpen(false)}
          onActionSuccess={handleActionSuccess}
          role={profile!.role as 'hod' | 'dean' | 'principal'}
        />
      )}
      
      {selectedEvent && isReportDialogOpen && (
        <EventReportDialog
          event={selectedEvent}
          isOpen={isReportDialogOpen}
          onClose={() => setIsReportDialogOpen(false)}
        />
      )}

      {selectedEvent && isRevokeDialogOpen && isApprover && (
        <RevokeApprovalDialog
          isOpen={isRevokeDialogOpen}
          onClose={() => setIsRevokeDialogOpen(false)}
          onRevokeSuccess={handleActionSuccess}
          event={selectedEvent}
          role={profile!.role as 'hod' | 'dean' | 'principal'}
        />
      )}
    </div>
  );
};

export default EventsOverview;