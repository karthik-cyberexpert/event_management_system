import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import TimePicker12Hour from './TimePicker12Hour';

// --- Constants for Checkbox Groups ---

const EVENT_CATEGORIES = [
  'curricular', 'tlp', 'extended curricular activity', 'R & D', 'consultancy', 
  'alumini', 'industry linkage', 'iic', 'sports', 'culturals', 'extension activity', 'others'
];

const TARGET_AUDIENCES = [
  'students', 'faculty', 'industry', 'alumini', 'community', 'others'
];

const FUNDING_SOURCES = [
  'institution', 'department', 'sponsership', 'participant fees', 'others'
];

const PROMOTION_STRATEGIES = [
  'posters', 'social media', 'email', 'others'
];

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => `SDG ${i + 1}`);

// --- Zod Schema ---

const coordinatorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact: z.string().regex(/^\d{10}$/, 'Contact must be a 10-digit number'),
});

const speakerSchema = z.object({
  name: z.string().min(1, 'Speaker name is required'),
  details: z.string().min(1, 'Details (Designation/Organization/Contact) are required'),
});

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  
  coordinators: z.array(coordinatorSchema).min(1, 'At least one coordinator is required'),
  speakers_list: z.array(speakerSchema).optional(),

  department_club: z.string().min(1, 'Department/Club is required'),
  mode_of_event: z.enum(['online', 'offline', 'hybrid'], { required_error: 'Mode of event is required' }),
  category: z.array(z.string()).min(1, 'Select at least one category'),
  category_others: z.string().optional(),
  objective: z.string().min(1, 'Objective is required'),
  sdg_alignment: z.array(z.string()).optional(),
  target_audience: z.array(z.string()).min(1, 'Select at least one target audience'),
  target_audience_others: z.string().optional(),
  expected_audience: z.coerce.number().int().positive('Must be a positive number').optional().nullable(),
  proposed_outcomes: z.string().min(1, 'Proposed outcomes are required'),
  
  budget_estimate: z.coerce.number().min(0, 'Budget cannot be negative').optional().nullable(),
  funding_source: z.array(z.string()).optional(),
  funding_source_others: z.string().optional(),
  promotion_strategy: z.array(z.string()).min(1, 'Select at least one promotion strategy'),
  promotion_strategy_others: z.string().optional(),

  venue_id: z.string().optional(),
  other_venue_details: z.string().optional(),
  event_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
}).refine(data => data.end_time > data.start_time, {
  message: "End time must be after start time",
  path: ["end_time"],
}).refine(data => {
  if (data.budget_estimate && data.budget_estimate > 0) {
    return data.funding_source && data.funding_source.length > 0;
  }
  return true;
}, {
  message: "Funding source is required if budget estimate is greater than zero.",
  path: ["funding_source"],
}).refine(data => {
  if (data.venue_id === 'other') {
    return !!data.other_venue_details && data.other_venue_details.trim().length > 0;
  }
  return !!data.venue_id;
}, {
  message: "Venue is required. If 'Other', please provide details.",
  path: ["venue_id"],
});

type FormSchema = z.infer<typeof formSchema>;

type Venue = {
  id: string;
  name: string;
};

type EventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: any | null;
  mode: 'create' | 'edit' | 'view';
};

const EventDialog = ({ isOpen, onClose, onSuccess, event, mode }: EventDialogProps) => {
  const { user, profile } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditMode = mode === 'edit';
  const isReadOnly = mode === 'view';
  const isCoordinator = profile?.role === 'coordinator';

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      department_club: '',
      mode_of_event: undefined,
      category: [],
      category_others: '',
      objective: '',
      sdg_alignment: [],
      target_audience: [],
      target_audience_others: '',
      expected_audience: undefined,
      proposed_outcomes: '',
      budget_estimate: undefined,
      funding_source: [],
      funding_source_others: '',
      promotion_strategy: [],
      promotion_strategy_others: '',
      venue_id: '',
      other_venue_details: '',
      event_date: '',
      start_time: '',
      end_time: '',
      coordinators: [{ name: '', contact: '' }],
      speakers_list: [{ name: '', details: '' }],
    },
  });

  const { fields: coordinatorFields, append: appendCoordinator, remove: removeCoordinator } = useFieldArray({
    control: form.control,
    name: "coordinators",
  });

  const { fields: speakerFields, append: appendSpeaker, remove: removeSpeaker } = useFieldArray({
    control: form.control,
    name: "speakers_list",
  });

  const budgetEstimate = form.watch('budget_estimate');
  const requiresFundingSource = budgetEstimate && budgetEstimate > 0;

  const departmentOption = profile?.department;
  const clubOption = profile?.club;
  
  useEffect(() => {
    const fetchVenues = async () => {
      const { data, error } = await supabase.from('venues').select('id, name');
      if (error) toast.error('Failed to fetch venues.');
      else setVenues(data);
    };
    fetchVenues();
  }, []);

  useEffect(() => {
    if (event) {
      const parseArrayField = (field: string[] | null | undefined, options: string[]) => {
        const safeField = field || [];
        const othersValue = safeField.find(item => !options.includes(item));
        const baseValues = safeField.filter(item => options.includes(item));
        return { base: baseValues, other: othersValue || '' };
      };

      const parsedCategory = parseArrayField(event.category, EVENT_CATEGORIES);
      const parsedAudience = parseArrayField(event.target_audience, TARGET_AUDIENCES);
      const parsedFunding = parseArrayField(event.funding_source, FUNDING_SOURCES);
      const parsedPromotion = parseArrayField(event.promotion_strategy, PROMOTION_STRATEGIES);
      const parsedCoordinators = (event.coordinator_name || []).map((name: string, index: number) => ({ name, contact: (event.coordinator_contact || [])[index] || '' }));
      const parsedSpeakers = (event.speakers || []).map((name: string, index: number) => ({ name, details: (event.speaker_details || [])[index] || '' }));

      form.reset({
        ...event,
        venue_id: event.venue_id || (event.other_venue_details ? 'other' : ''),
        expected_audience: event.expected_audience ?? null,
        budget_estimate: event.budget_estimate ?? null,
        category: parsedCategory.base,
        category_others: parsedCategory.other,
        target_audience: parsedAudience.base,
        target_audience_others: parsedAudience.other,
        funding_source: parsedFunding.base,
        funding_source_others: parsedFunding.other,
        promotion_strategy: parsedPromotion.base,
        promotion_strategy_others: parsedPromotion.other,
        sdg_alignment: event.sdg_alignment || [],
        coordinators: parsedCoordinators.length > 0 ? parsedCoordinators : [{ name: '', contact: '' }],
        speakers_list: parsedSpeakers.length > 0 ? parsedSpeakers : [{ name: '', details: '' }],
      });
    } else {
      let defaultDeptClub = departmentOption || clubOption || '';
      form.reset({
        coordinators: [{ name: '', contact: '' }],
        speakers_list: [{ name: '', details: '' }],
        department_club: defaultDeptClub,
        category: [], sdg_alignment: [], target_audience: [], funding_source: [], promotion_strategy: [],
        expected_audience: undefined, budget_estimate: undefined,
      });
    }
  }, [event, form, departmentOption, clubOption]);

  const onSubmit = async (values: FormSchema) => {
    if (!user) return;
    setIsSubmitting(true);

    const transformArrayField = (base: string[], other?: string) => [...base, ...(other && other.trim() ? [other.trim()] : [])];
    const venueIsOther = values.venue_id === 'other';

    if (!venueIsOther && values.venue_id) {
      const { data: isAvailable, error: checkError } = await supabase.rpc('check_venue_availability', {
        p_venue_id: values.venue_id, p_event_date: values.event_date, p_start_time: values.start_time, p_end_time: values.end_time, p_event_id: isEditMode ? event.id : null,
      });
      if (checkError || !isAvailable) {
        toast.error('Venue is not available at the selected date and time.');
        setIsSubmitting(false);
        return;
      }
    }

    const eventData = {
      title: values.title, description: values.description,
      venue_id: venueIsOther ? null : values.venue_id,
      other_venue_details: venueIsOther ? values.other_venue_details : null,
      event_date: values.event_date, start_time: values.start_time, end_time: values.end_time,
      expected_audience: values.expected_audience, department_club: values.department_club,
      coordinator_name: values.coordinators.map(c => c.name),
      coordinator_contact: values.coordinators.map(c => c.contact),
      mode_of_event: values.mode_of_event,
      category: transformArrayField(values.category, values.category_others),
      objective: values.objective, sdg_alignment: values.sdg_alignment,
      target_audience: transformArrayField(values.target_audience, values.target_audience_others),
      proposed_outcomes: values.proposed_outcomes,
      speakers: values.speakers_list?.map(s => s.name) || [],
      speaker_details: values.speakers_list?.map(s => s.details) || [],
      budget_estimate: values.budget_estimate || 0,
      funding_source: transformArrayField(values.funding_source || [], values.funding_source_others),
      promotion_strategy: transformArrayField(values.promotion_strategy, values.promotion_strategy_others),
      hod_approval_at: null, dean_approval_at: null, principal_approval_at: null,
    };

    const { error } = isEditMode
      ? await supabase.from('events').update({ ...eventData, status: 'pending_hod', remarks: null }).eq('id', event.id)
      : await supabase.from('events').insert({ ...eventData, submitted_by: user.id });

    if (error) {
      toast.error(`Failed to save event: ${error.message}`);
    } else {
      toast.success(`Event ${isEditMode ? 'updated and resubmitted' : 'created'} successfully.`);
      onSuccess();
    }
    setIsSubmitting(false);
  };

  const getDialogTitle = () => mode === 'view' ? 'View Event Details' : (isEditMode ? 'Edit Event' : 'Create New Event');
  const getDialogDescription = () => {
    const submitterName = event?.profiles ? `${event.profiles.first_name} ${event.profiles.last_name}` : 'N/A';
    return mode === 'view' ? `Viewing details for: ${event?.title || 'event'}. Submitted by: ${submitterName}`
      : (isEditMode ? 'Make changes and resubmit for approval.' : 'Fill out the form below to create a new event.');
  };

  const renderDepartmentClubField = () => {
    if (!isCoordinator) return <Alert variant="destructive"><AlertTitle>Access Denied</AlertTitle><AlertDescription>Only coordinators can create events.</AlertDescription></Alert>;
    if (!departmentOption && !clubOption) return <Alert variant="destructive"><AlertTitle>Missing Assignment</AlertTitle><AlertDescription>Your profile is not assigned to a Department or Club. Contact an admin.</AlertDescription></Alert>;
    
    return (
      <FormField control={form.control} name="department_club" render={({ field }) => (
        <FormItem>
          <FormLabel>Organizing Department/Club</FormLabel>
          <FormControl>
            <Input placeholder="Enter your department or club" {...field} disabled={isReadOnly} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {(isEditMode || isReadOnly) && event?.remarks && (
          <Alert><Terminal className="h-4 w-4" /><AlertTitle>Approver Remarks</AlertTitle><AlertDescription>{event.remarks}</AlertDescription></Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Event Title</FormLabel><FormControl><Input placeholder="Event Title" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="md:col-span-2">{renderDepartmentClubField()}</div>
              <div className="space-y-4 md:col-span-2 border p-4 rounded-lg">
                <h3 className="text-lg font-semibold border-b pb-2">Event Coordinators</h3>
                {coordinatorFields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end border-b pb-4 last:border-b-0 last:pb-0">
                    <FormField control={form.control} name={`coordinators.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Coordinator {index + 1} Name</FormLabel><FormControl><Input placeholder="Coordinator Name" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`coordinators.${index}.contact`} render={({ field }) => (<FormItem><FormLabel>Contact Number (10 digits)</FormLabel><FormControl><Input type="tel" placeholder="9876543210" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                    {!isReadOnly && coordinatorFields.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => removeCoordinator(index)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
                {!isReadOnly && <Button type="button" variant="outline" onClick={() => appendCoordinator({ name: '', contact: '' })} className="w-full mt-2"><Plus className="mr-2 h-4 w-4" /> Add New Coordinator</Button>}
              </div>
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Schedule & Location</h3>
                <FormField control={form.control} name="event_date" render={({ field }) => (<FormItem><FormLabel>Proposed Date</FormLabel><FormControl><Input type="date" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_time" render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><TimePicker12Hour value={field.value} onChange={field.onChange} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="end_time" render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><TimePicker12Hour value={field.value} onChange={field.onChange} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="venue_id" render={({ field }) => (<FormItem><FormLabel>Venue</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select a venue" /></SelectTrigger></FormControl><SelectContent>{venues.map((venue) => (<SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>))}<SelectItem value="other">Other (Please specify)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                {form.watch('venue_id') === 'other' && (
                  <FormField control={form.control} name="other_venue_details" render={({ field }) => (<FormItem><FormLabel>Other Venue Details & Reason</FormLabel><FormControl><Textarea placeholder="Specify the venue and reason for not choosing from the list" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)} />
                )}
              </div>
              {/* Other form fields... (shortened for brevity) */}
            </div>
            <DialogFooter>
              {isReadOnly ? <Button type="button" variant="outline" onClick={onClose}>Close</Button> : (<><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : (isEditMode ? 'Update & Resubmit' : 'Submit for Approval')}</Button></>)}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;