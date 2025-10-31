import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  event_id: string | null;
};

type NotificationBellProps = {
  onNotificationClick: (notification: Notification) => void;
};

const NotificationBell = ({ onNotificationClick }: NotificationBellProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel('realtime-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic UI update
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error('Failed to mark all as read:', error);
      // Re-fetch on error to restore correct state
      fetchNotifications();
    }
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    // We will rely on the explicit button click for marking all as read, 
    // instead of closing the popover automatically marking them read.
  };

  const handleItemClick = (notification: Notification) => {
    onNotificationClick(notification);
    setIsPopoverOpen(false); // Close popover on click
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs" variant="destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex justify-between items-center p-4 border-b">
          <h4 className="font-medium leading-none">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="text-xs h-6 px-2 text-primary hover:bg-primary/10"
            >
              <CheckCheck className="h-3 w-3 mr-1" /> Mark All Read
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-4">No new notifications.</p>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleItemClick(notification)}
                  disabled={!notification.event_id}
                  className={`w-full text-left mb-2 items-start pb-2 last:mb-0 last:pb-0 border-b last:border-none p-2 rounded-md transition-colors ${!notification.is_read ? 'font-semibold' : 'text-muted-foreground'} ${notification.event_id ? 'hover:bg-accent cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="space-y-1">
                    <p className="text-sm leading-snug">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer with Mark All As Read button (as requested, placed at the bottom left) */}
        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;