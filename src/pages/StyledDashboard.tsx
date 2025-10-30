import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Users, 
  Building, 
  ClipboardList, 
  TrendingUp, 
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusConfig: { [key: string]: { icon: React.ElementType; color: string; label: string } } = {
  approved: { icon: CheckCircle, color: "bg-green-100 text-green-800", label: "Approved" },
  pending_hod: { icon: Clock, color: "bg-yellow-100 text-yellow-800", label: "Pending HOD" },
  pending_dean: { icon: Clock, color: "bg-yellow-100 text-yellow-800", label: "Pending Dean" },
  pending_principal: { icon: Clock, color: "bg-yellow-100 text-yellow-800", label: "Pending Principal" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Rejected" },
  returned_to_coordinator: { icon: AlertCircle, color: "bg-orange-100 text-orange-800", label: "Returned" },
  returned_to_hod: { icon: AlertCircle, color: "bg-orange-100 text-orange-800", label: "Returned" },
  returned_to_dean: { icon: AlertCircle, color: "bg-orange-100 text-orange-800", label: "Returned" },
};

const StyledDashboard = () => {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalUsers: 0,
    totalVenues: 0,
    pendingApprovals: 0,
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventsCount, usersCount, venuesCount, pendingCount, recentEventsData] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('venues').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['pending_hod', 'pending_dean', 'pending_principal', 'returned_to_hod', 'returned_to_dean']),
          supabase.from('events').select('id, title, created_at, status').order('created_at', { ascending: false }).limit(4)
        ]);

        if (eventsCount.error || usersCount.error || venuesCount.error || pendingCount.error || recentEventsData.error) {
          console.error('Dashboard fetch errors:', {
            eventsCount: eventsCount.error,
            usersCount: usersCount.error,
            venuesCount: venuesCount.error,
            pendingCount: pendingCount.error,
            recentEventsData: recentEventsData.error,
          });
          throw new Error('Failed to fetch dashboard data.');
        }

        setStats({
          totalEvents: eventsCount.count ?? 0,
          totalUsers: usersCount.count ?? 0,
          totalVenues: venuesCount.count ?? 0,
          pendingApprovals: pendingCount.count ?? 0,
        });
        setRecentEvents(recentEventsData.data || []);

      } catch (error: any) {
        toast.error(error.message || 'Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { title: "Total Events", value: stats.totalEvents, icon: Calendar },
    { title: "Total Users", value: stats.totalUsers, icon: Users },
    { title: "Total Venues", value: stats.totalVenues, icon: Building },
    { title: "Pending Approvals", value: stats.pendingApprovals, icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
          <p className="text-muted-foreground">A high-level overview of the Event Management System.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-1/3" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Events and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Recently Created Events
            </CardTitle>
            <CardDescription>The four most recently created events.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <Skeleton className="h-5 w-40 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentEvents.length > 0 ? recentEvents.map((event) => {
                  const config = statusConfig[event.status] || { icon: AlertCircle, color: "bg-gray-100 text-gray-800", label: event.status.replace(/_/g, ' ') };
                  const StatusIcon = config.icon;
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created: {format(new Date(event.created_at), 'PPP')}
                        </p>
                      </div>
                      <Badge className={`${config.color} flex items-center capitalize`}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent events found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Chart Placeholder */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Activity Overview
            </CardTitle>
            <CardDescription>Event creation trends (placeholder)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-primary" />
                <p className="mt-2 text-muted-foreground">Activity chart visualization</p>
                <p className="text-sm text-muted-foreground">A chart of event trends would be displayed here.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StyledDashboard;