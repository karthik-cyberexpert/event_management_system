import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  Building, 
  ClipboardList, 
  TrendingUp, 
  Bell,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";

const StyledDashboard = () => {
  // Mock data for dashboard
  const stats = [
    { title: "Total Events", value: "24", icon: Calendar, change: "+2 from last month" },
    { title: "Active Users", value: "142", icon: Users, change: "+12 from last month" },
    { title: "Venues", value: "8", icon: Building, change: "No change" },
    { title: "Pending Approvals", value: "5", icon: ClipboardList, change: "-3 from last week" },
  ];

  const recentEvents = [
    { id: 1, title: "Annual Tech Conference", date: "2023-06-15", status: "approved" },
    { id: 2, title: "Marketing Workshop", date: "2023-06-18", status: "pending" },
    { id: 3, title: "Product Launch", date: "2023-06-20", status: "approved" },
    { id: 4, title: "Team Building", date: "2023-06-22", status: "rejected" },
  ];

  const statusIcons = {
    approved: CheckCircle,
    pending: Clock,
    rejected: XCircle,
  };

  const statusColors = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <Button>
          <Bell className="mr-2 h-4 w-4" /> Notifications
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Events and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Recent Events
            </CardTitle>
            <CardDescription>Latest events in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.map((event) => {
                const StatusIcon = statusIcons[event.status as keyof typeof statusIcons];
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                    <div>
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge className={`${statusColors[event.status as keyof typeof statusColors]} flex items-center`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Activity Overview
            </CardTitle>
            <CardDescription>Event creation trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-primary" />
                <p className="mt-2 text-muted-foreground">Activity chart visualization</p>
                <p className="text-sm text-muted-foreground">Would show event trends here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StyledDashboard;