import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EventActionDialog from './EventActionDialog';
import EventDialog from './EventDialog';

type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  event_id: string | null;
};

const Layout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notificationEvent, setNotificationEvent] = useState<any | null>(null);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.event_id) {
      toast.info("This notification is not related to a specific event.");
      return;
    }

    if (!notification.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
    }

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venues ( name, location ),
        submitted_by:profiles ( first_name, last_name )
      `)
      .eq('id', notification.event_id)
      .single();

    if (error || !data) {
      toast.error("Could not find the event associated with this notification.");
      return;
    }
    
    const eventData = {
        ...data,
        profiles: data.submitted_by,
    };

    setNotificationEvent(eventData);
  };

  const handleDialogClose = () => {
    setNotificationEvent(null);
  };

  const handleActionSuccess = () => {
    setNotificationEvent(null);
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 bg-sidebar p-4">
           <div className="p-2 mb-4">
             <Skeleton className="h-8 w-2/5 bg-sidebar-accent" />
           </div>
           <div className="space-y-2">
             <Skeleton className="h-9 w-full bg-sidebar-accent" />
             <Skeleton className="h-9 w-full bg-sidebar-accent" />
             <Skeleton className="h-9 w-full bg-sidebar-accent" />
           </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="flex justify-between items-center p-4 border-b bg-background">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-24" />
            </div>
          </header>
          <main className="flex-1 p-6 bg-muted">
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-96 w-full" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 border-b bg-background">
          <h1 className="text-xl font-semibold">Event Management System</h1>
          <div className="flex items-center gap-4">
            <NotificationBell onNotificationClick={handleNotificationClick} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  <span>{profile.first_name} {profile.last_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6 bg-muted">{children}</main>
      </div>

      {notificationEvent && profile && ['hod', 'dean', 'principal'].includes(profile.role) && (
        <EventActionDialog
          event={notificationEvent}
          isOpen={!!notificationEvent}
          onClose={handleDialogClose}
          onActionSuccess={handleActionSuccess}
          role={profile.role as 'hod' | 'dean' | 'principal'}
        />
      )}

      {notificationEvent && profile && ['coordinator', 'admin'].includes(profile.role) && (
        <EventDialog
          event={notificationEvent}
          isOpen={!!notificationEvent}
          onClose={handleDialogClose}
          onSuccess={handleDialogClose}
          mode="view"
        />
      )}
    </div>
  );
};

export default Layout;