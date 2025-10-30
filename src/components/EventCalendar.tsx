import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, EventProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
};

type EventCalendarProps = {
  events: any[];
};

const CustomEvent = ({ event }: EventProps<CalendarEvent>) => (
  <div>
    <strong>{event.title}</strong>
    <p className="text-xs">{event.resource.venues?.name}</p>
  </div>
);

const EventCalendar = ({ events }: EventCalendarProps) => {
  const formattedEvents: CalendarEvent[] = useMemo(() => {
    return events.map((event) => {
      const [startHour, startMinute] = event.start_time.split(':');
      const [endHour, endMinute] = event.end_time.split(':');
      
      const startDate = new Date(event.event_date);
      startDate.setHours(parseInt(startHour, 10), parseInt(startMinute, 10));

      const endDate = new Date(event.event_date);
      endDate.setHours(parseInt(endHour, 10), parseInt(endMinute, 10));

      return {
        id: event.id,
        title: event.title,
        start: startDate,
        end: endDate,
        resource: event,
      };
    });
  }, [events]);

  return (
    <Card>
      <CardContent className="p-4">
        <div style={{ height: '70vh' }}>
          <Calendar
            localizer={localizer}
            events={formattedEvents}
            startAccessor="start"
            endAccessor="end"
            components={{
              event: CustomEvent,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCalendar;