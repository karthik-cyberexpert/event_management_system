import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import EventReportDialog from './EventReportDialog';

const lookupSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 characters.').regex(/^[A-Z0-9]+$/, 'Code must be alphanumeric.'),
});

const EventLookup = () => {
  const [loading, setLoading] = useState(false);
  const [foundEvent, setFoundEvent] = useState<any | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const form = useForm<z.infer<typeof lookupSchema>>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (values: z.infer<typeof lookupSchema>) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('unique_code', values.code.toUpperCase())
      .single();
    
    setLoading(false);

    if (error || !data) {
      toast.error('No event found with that code.');
      setFoundEvent(null);
    } else {
      toast.success('Event found!');
      setFoundEvent(data);
      setIsReportOpen(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Event Lookup</CardTitle>
          <CardDescription>Find an event by its unique 6-character registration code.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input 
                        placeholder="e.g., A1B2C3" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {foundEvent && (
        <EventReportDialog
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          event={foundEvent}
        />
      )}
    </>
  );
};

export default EventLookup;