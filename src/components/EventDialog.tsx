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
  description: z.string().optional(),
  
  // Updated fields for multiple coordinators
  coordinators: z.array(coordinatorSchema).min(1, 'At least one coordinator is required'),
  speakers_list: z.array(speakerSchema).optional(),

  // New fields
  department_club: z.string().min(1, 'Department/Club is required'),
  mode_of_event: z.enum(['online', 'offline', 'hybrid'], { required_error: 'Mode of event is required' }),
  category: z.array(z.string()).min(1, 'Select at least one category'),
  category_others: z.string().optional(),
  objective: z.string().min(1, 'Objective is required'),
  sdg_alignment: z.array(z.string()).optional(),
  target_audience: z.array(z.string()).min(1, 'Select at least one target audience'),
  target_audience_others: z.string().optional(),
  expected_audience: z.coerce.number().int().positive('Must be a positive number').optional(),
  proposed_outcomes: z.string().min(1, 'Proposed outcomes are required'),
  
  budget_estimate: z.coerce.number().min(0, 'Budget cannot be negative').optional(),
  funding_source: z.array(z.string()).optional(),
  funding_source_others: z.string().optional(),
  promotion_strategy: z.array(z.string()).min(1, 'Select at least one promotion strategy'),
  promotion_strategy_others: z.string().optional(),

  // Existing fields
  venue_id: z.string().min(1, 'Venue is required'),
  event_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
}).refine(data => data.end_time > data.start_time, {
  message: "End time must be after start time",
  path: ["end_time"],
}).refine(data => {
  // Conditional validation for funding source based on budget
  if (data.budget_estimate && data.budget_estimate > 0) {
    return data.funding_source && data.funding_source.length > 0;
  }
  return true;
}, {
  message: "Funding source is required if budget estimate is greater than zero.",
  path: ["funding_source"],
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
};

const EventDialog = ({ isOpen, onClose, onSuccess, event }: EventDialogProps) => {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!event;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      department_club: '',
      mode_of_event: undefined,
      category: [], // Ensure default is []
      category_others: '',
      objective: '',
      sdg_alignment: [], // Ensure default is []
      target_audience: [], // Ensure default is []
      target_audience_others: '',
      // Initialize optional numeric fields to 0 or undefined based on context
      expected_audience: undefined,
      proposed_outcomes: '',
      budget_estimate: undefined,
      funding_source: [], // Ensure default is []
      funding_source_others: '',
      promotion_strategy: [], // Ensure default is []
      promotion_strategy_others: '',
      venue_id: '',
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

  useEffect(() => {
    const fetchVenues = async () => {
      const { data, error } = await supabase.from('venues').select('id, name');
      if (error) {
        toast.error('Failed to fetch venues.');
      } else {
        setVenues(data);
      }
    };
    fetchVenues();
  }, []);

  useEffect(() => {
    if (event) {
      // Helper to parse array fields which might include an 'others' value
      const parseArrayField = (field: string[] | null | undefined, options: string[]) => {
        const safeField = field || [];
        const othersValue = safeField.find(item => !options.includes(item));
        const baseValues = safeField.filter(item => options.includes(item));
        return {
          base: baseValues,
          other: othersValue || '',
        };
      };

      const parsedCategory = parseArrayField(event.category, EVENT_CATEGORIES);
      const parsedAudience = parseArrayField(event.target_audience, TARGET_AUDIENCES);
      const parsedFunding = parseArrayField(event.funding_source, FUNDING_SOURCES);
      const parsedPromotion = parseArrayField(event.promotion_strategy, PROMOTION_STRATEGIES);

      // Parse coordinator arrays back into an array of objects
      const parsedCoordinators = (event.coordinator_name || []).map((name: string, index: number) => ({
        name: name,
        contact: (event.coordinator_contact || [])[index] || '',
      }));
      
      // Parse speaker arrays back into an array of objects
      const parsedSpeakers = (event.speakers || []).map((name: string, index: number) => ({
        name: name,
        details: (event.speaker_details || [])[index] || '',
      }));

      form.reset({
        ...event,
        // Ensure numeric fields are handled as numbers or undefined
        expected_audience: event.expected_audience || undefined,
        budget_estimate: event.budget_estimate || undefined,
        
        // Parsed array fields
        category: parsedCategory.base,
        category_others: parsedCategory.other,
        target_audience: parsedAudience.base,
        target_audience_others: parsedAudience.other,
        funding_source: parsedFunding.base,
        funding_source_others: parsedFunding.other,
        promotion_strategy: parsedPromotion.base,
        promotion_strategy_others: parsedPromotion.other,
        
        // SDG is simple array
        sdg_alignment: event.sdg_alignment || [],
        
        // Coordinators
        coordinators: parsedCoordinators.length > 0 ? parsedCoordinators : [{ name: '', contact: '' }],
        
        // Speakers
        speakers_list: parsedSpeakers.length > 0 ? parsedSpeakers : [{ name: '', details: '' }],
      });
    } else {
      form.reset({
        // Reset to initial default values
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
        event_date: '',
        start_time: '',
        end_time: '',
        coordinators: [{ name: '', contact: '' }],
        speakers_list: [{ name: '', details: '' }],
      });
    }
  }, [event, form]);

  const onSubmit = async (values: FormSchema) => {
    if (!user) return;
    setIsSubmitting(true);

    // --- Data Transformation ---
    const transformArrayField = (base: string[], other: string | undefined) => {
      const result = [...base];
      if (other && other.trim()) {
        result.push(other.trim());
      }
      return result;
    };

    const finalCategory = transformArrayField(values.category, values.category_others);
    const finalAudience = transformArrayField(values.target_audience, values.target_audience_others);
    const finalFunding = transformArrayField(values.funding_source || [], values.funding_source_others);
    const finalPromotion = transformArrayField(values.promotion_strategy, values.promotion_strategy_others);
    
    // Transform coordinators array of objects into two separate arrays of strings
    const coordinatorNames = values.coordinators.map(c => c.name);
    const coordinatorContacts = values.coordinators.map(c => c.contact);
    
    // Transform speakers array of objects into two separate arrays of strings
    const speakerNames = values.speakers_list?.map(s => s.name) || [];
    const speakerDetails = values.speakers_list?.map(s => s.details) || [];

    const eventData = {
      title: values.title,
      description: values.description,
      venue_id: values.venue_id,
      event_date: values.event_date,
      start_time: values.start_time,
      end_time: values.end_time,
      expected_audience: values.expected_audience,
      
      // New fields
      department_club: values.department_club,
      coordinator_name: coordinatorNames, // Array of names
      coordinator_contact: coordinatorContacts, // Array of contacts
      mode_of_event: values.mode_of_event,
      category: finalCategory,
      objective: values.objective,
      sdg_alignment: values.sdg_alignment,
      target_audience: finalAudience,
      proposed_outcomes: values.proposed_outcomes,
      speakers: speakerNames, // Array of names
      speaker_details: speakerDetails, // Array of details
      budget_estimate: values.budget_estimate || 0,
      funding_source: values.budget_estimate && values.budget_estimate > 0 ? finalFunding : null,
      promotion_strategy: finalPromotion,
      
      // Reset approval timestamps on resubmit
      hod_approval_at: null,
      dean_approval_at: null,
      principal_approval_at: null,
    };
    // --- End Data Transformation ---

    // Check venue availability, excluding the current event if in edit mode
    const rpcParams: { [key: string]: any } = {
      p_venue_id: values.venue_id,
      p_event_date: values.event_date,
      p_start_time: values.start_time,
      p_end_time: values.end_time,
    };

    if (isEditMode && event.id) {
      rpcParams.p_event_id = event.id;
    }

    const { data: isAvailable, error: checkError } = await supabase.rpc('check_venue_availability', rpcParams);

    if (checkError || !isAvailable) {
      toast.error(checkError?.message || 'Venue is not available at the selected date and time.');
      setIsSubmitting(false);
      return;
    }

    let error;
    if (isEditMode) {
      // Update existing event and reset status for re-approval
      const { error: updateError } = await supabase
        .from('events')
        .update({ ...eventData, status: 'pending_hod', remarks: null })
        .eq('id', event.id);
      error = updateError;
    } else {
      // Insert new event
      const { error: insertError } = await supabase.from('events').insert({
        ...eventData,
        submitted_by: user.id,
      });
      error = insertError;
    }

    if (error) {
      toast.error(`Failed to save event: ${error.message}`);
    } else {
      toast.success(`Event ${isEditMode ? 'updated and resubmitted' : 'created'} successfully.`);
      onSuccess();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Make changes and resubmit for approval.' : 'Fill out the form below to create a new event.'}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && event.remarks && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Approver Remarks</AlertTitle>
            <AlertDescription>{event.remarks}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* --- Basic Info --- */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Event Details</h3>
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Event Title</FormLabel><FormControl><Input placeholder="Event Title" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Event Description</FormLabel><FormControl><Textarea placeholder="Detailed description of the event" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="department_club" render={({ field }) => (<FormItem><FormLabel>Department/Club</FormLabel><FormControl><Input placeholder="e.g., Computer Science Department" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="objective" render={({ field }) => (<FormItem><FormLabel>Objective of the Event</FormLabel><FormControl><Textarea placeholder="State the main objective" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="proposed_outcomes" render={({ field }) => (<FormItem><FormLabel>Proposed Outcomes</FormLabel><FormControl><Textarea placeholder="Expected results or benefits" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>

              {/* --- Coordinator Info --- */}
              <div className="space-y-4 md:col-span-2 border p-4 rounded-lg">
                <h3 className="text-lg font-semibold border-b pb-2">Coordinator Information</h3>
                {coordinatorFields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end border-b pb-4 last:border-b-0 last:pb-0">
                    <FormField
                      control={form.control}
                      name={`coordinators.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coordinator {index + 1} Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Coordinator Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`coordinators.${index}.contact`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number (10 digits)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="9876543210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      {coordinatorFields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeCoordinator(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendCoordinator({ name: '', contact: '' })}
                  className="w-full mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add New Coordinator
                </Button>
              </div>

              {/* --- Speakers/Resource Person --- */}
              <div className="space-y-4 md:col-span-2 border p-4 rounded-lg">
                <h3 className="text-lg font-semibold border-b pb-2">Speakers / Resource Person</h3>
                {speakerFields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end border-b pb-4 last:border-b-0 last:pb-0">
                    <FormField
                      control={form.control}
                      name={`speakers_list.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-1">
                          <FormLabel>Speaker {index + 1} Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Speaker Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`speakers_list.${index}.details`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Designation/Details</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Designation, Organization, Contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end sm:col-span-1">
                      {speakerFields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeSpeaker(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendSpeaker({ name: '', details: '' })}
                  className="w-full mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add New Speaker
                </Button>
              </div>

              {/* --- Date, Time, Venue --- */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Schedule & Location</h3>
                <FormField control={form.control} name="event_date" render={({ field }) => (<FormItem><FormLabel>Proposed Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_time" render={({ field }) => (<FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="end_time" render={({ field }) => (<FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="venue_id" render={({ field }) => (<FormItem><FormLabel>Venue</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a venue" /></SelectTrigger></FormControl><SelectContent>{venues.map((venue) => (<SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="expected_audience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected No. of Participants</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 100" 
                        {...field} 
                        // Ensure value is always a string representation of the number or an empty string
                        value={field.value === undefined ? '' : String(field.value)} 
                        onChange={e => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : +value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* --- Mode of Event --- */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Event Mode</h3>
                <FormField control={form.control} name="mode_of_event" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Mode of Event</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="online" /></FormControl>
                          <FormLabel className="font-normal">Online</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="offline" /></FormControl>
                          <FormLabel className="font-normal">Offline</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="hybrid" /></FormControl>
                          <FormLabel className="font-normal">Hybrid</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* --- Category Checkboxes --- */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Event Category</h3>
                <FormField control={form.control} name="category" render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {EVENT_CATEGORIES.map((item) => (
                        <FormField key={item} control={form.control} name="category" render={({ field }) => (
                          <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value ?? [];
                                  return checked
                                    ? field.onChange([...currentValues, item])
                                    : field.onChange(currentValues.filter((value) => value !== item));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize">{item.replace(/_/g, ' ')}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    {form.watch('category').includes('others') && (
                      <FormField control={form.control} name="category_others" render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Specify Other Category</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* --- Target Audience Checkboxes --- */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Target Audience</h3>
                <FormField control={form.control} name="target_audience" render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {TARGET_AUDIENCES.map((item) => (
                        <FormField key={item} control={form.control} name="target_audience" render={({ field }) => (
                          <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value ?? [];
                                  return checked
                                    ? field.onChange([...currentValues, item])
                                    : field.onChange(currentValues.filter((value) => value !== item));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize">{item}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    {form.watch('target_audience').includes('others') && (
                      <FormField control={form.control} name="target_audience_others" render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Specify Other Audience</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* --- Budget and Funding --- */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Budget & Funding</h3>
                <FormField control={form.control} name="budget_estimate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Estimate (in Rupees)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        // Ensure value is always a string representation of the number or an empty string
                        value={field.value === undefined ? '' : String(field.value)} 
                        onChange={e => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : +value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className={cn(
                  !requiresFundingSource && 'opacity-50 pointer-events-none',
                  'transition-opacity'
                )}>
                  <FormField control={form.control} name="funding_source" render={() => (
                    <FormItem>
                      <FormLabel>Funding Source (Required if budget &gt; 0)</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {FUNDING_SOURCES.map((item) => (
                          <FormField key={item} control={form.control} name="funding_source" render={({ field }) => (
                            <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value ?? [];
                                    return checked
                                      ? field.onChange([...currentValues, item])
                                      : field.onChange(currentValues.filter((value) => value !== item));
                                  }}
                                  disabled={!requiresFundingSource}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">{item.replace(/_/g, ' ')}</FormLabel>
                            </FormItem>
                          )} />
                        ))}
                      </div>
                      {form.watch('funding_source')?.includes('others') && (
                        <FormField control={form.control} name="funding_source_others" render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormLabel>Specify Other Funding Source</FormLabel>
                            <FormControl><Textarea {...field} /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* --- Promotion Strategy --- */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Event Promotion Strategy</h3>
                <FormField control={form.control} name="promotion_strategy" render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {PROMOTION_STRATEGIES.map((item) => (
                        <FormField key={item} control={form.control} name="promotion_strategy" render={({ field }) => (
                          <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value ?? [];
                                  return checked
                                    ? field.onChange([...currentValues, item])
                                    : field.onChange(currentValues.filter((value) => value !== item));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize">{item.replace(/_/g, ' ')}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    {form.watch('promotion_strategy').includes('others') && (
                      <FormField control={form.control} name="promotion_strategy_others" render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Specify Other Promotion Strategy</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* --- SDG Alignment Checkboxes --- */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold border-b pb-2">Alignment with SDGs (Optional)</h3>
                <FormField control={form.control} name="sdg_alignment" render={() => (
                  <FormItem>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {SDG_GOALS.map((item) => (
                        <FormField key={item} control={form.control} name="sdg_alignment" render={({ field }) => (
                          <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value ?? [];
                                  return checked
                                    ? field.onChange([...currentValues, item])
                                    : field.onChange(currentValues.filter((value) => value !== item));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{item}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* --- Approval Status (Read-Only) --- */}
            {isEditMode && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold border-b pb-2">Approval Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormItem>
                    <FormLabel>HOD Approval</FormLabel>
                    <Input 
                      value={event.hod_approval_at ? `Approved on ${format(new Date(event.hod_approval_at), 'PPP p')}` : 'Pending'} 
                      disabled 
                      className={cn(event.hod_approval_at ? 'border-green-500' : 'border-yellow-500')}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>Dean Approval</FormLabel>
                    <Input 
                      value={event.dean_approval_at ? `Approved on ${format(new Date(event.dean_approval_at), 'PPP p')}` : 'Pending'} 
                      disabled 
                      className={cn(event.dean_approval_at ? 'border-green-500' : 'border-yellow-500')}
                    />
                  </FormItem>
                  <FormItem>
                    <FormLabel>Principal Approval</FormLabel>
                    <Input 
                      value={event.principal_approval_at ? `Approved on ${format(new Date(event.principal_approval_at), 'PPP p')}` : 'Pending'} 
                      disabled 
                      className={cn(event.principal_approval_at ? 'border-green-500' : 'border-yellow-500')}
                    />
                  </FormItem>
                </div>
                <FormItem>
                  <FormLabel>Remarks (Last Approver)</FormLabel>
                  <Textarea value={event.remarks || 'N/A'} disabled />
                </FormItem>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update & Resubmit' : 'Submit for Approval')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;