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
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors: { [key: string]: string } = {
  pending_hod: 'bg-yellow-500',
  returned_to_teacher: 'bg-orange-500',
  pending_dean: 'bg-yellow-600',
  returned_to_hod: 'bg-orange-600',
  pending_principal: 'bg-yellow-700',
  returned_to_dean: 'bg-orange-700',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const AllEvents = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAllEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venues ( name ),
          profiles:submitted_by ( first_name, last_name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to fetch events.');
      } else {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchAllEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [events, statusFilter, searchTerm]);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">All Events Overview</h2>
      
      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow">
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
            <SelectItem value="returned_to_teacher">Returned to Teacher</SelectItem>
            <SelectItem value="returned_to_hod">Returned to HOD</SelectItem>
            <SelectItem value="returned_to_dean">Returned to Dean</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No events match the criteria.</TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.profiles?.first_name} {event.profiles?.last_name}</TableCell>
                  <TableCell>{event.venues?.name || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(event.event_date), 'PPP')}</TableCell>
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

export default AllEvents;