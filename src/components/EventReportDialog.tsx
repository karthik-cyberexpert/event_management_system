import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type EventReportDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
};

type ReportData = any;

const EventReportContent = ({ data }: { data: ReportData }) => {
  if (!data) return null;

  const formatArray = (arr: string[] | null | undefined) => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.map(item => item.charAt(0).toUpperCase() + item.slice(1).replace(/_/g, ' ')).join(', ');
  };

  const renderCoordinators = () => {
    const names = data.coordinator_name || [];
    const contacts = data.coordinator_contact || [];
    if (names.length === 0) return <span>N/A</span>;
    return (
      <ul className="list-disc list-inside space-y-1">
        {names.map((name: string, index: number) => (
          <li key={index}>{name} ({contacts[index] || 'No contact'})</li>
        ))}
      </ul>
    );
  };

  const renderSpeakers = () => {
    const names = data.speakers || [];
    const details = data.speaker_details || [];
    if (names.length === 0) return <span>N/A</span>;
    return (
      <ul className="list-disc list-inside space-y-1">
        {names.map((name: string, index: number) => (
          <li key={index}><strong>{name}</strong>: {details[index] || 'No details provided'}</li>
        ))}
      </ul>
    );
  };

  const ApprovalStatus = ({ role, timestamp }: { role: string, timestamp: string | null }) => (
    <div className="flex justify-between items-center border-b py-2">
      <span className="font-medium">{role} Approval:</span>
      {timestamp ? (
        <Badge className="bg-green-500 text-white">Approved on {format(new Date(timestamp), 'PPP p')}</Badge>
      ) : (
        <Badge variant="destructive">Not Approved</Badge>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 print:p-0 print:text-black">
      <header className="text-center border-b pb-4 mb-4 print:border-b-2">
        <h1 className="text-2xl font-bold text-primary print:text-3xl">{data.title}</h1>
        <p className="text-lg text-muted-foreground">Event Approval Report</p>
      </header>
      <Card className="print:border-none print:shadow-none">
        <CardHeader><CardTitle className="text-xl">Basic Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><strong>Department/Club:</strong> {data.department_club || 'N/A'}</div>
          <div><strong>Mode:</strong> <Badge variant="secondary" className="capitalize">{data.mode_of_event || 'N/A'}</Badge></div>
          <div><strong>Date:</strong> {format(new Date(data.event_date), 'PPP')}</div>
          <div><strong>Time:</strong> {data.start_time} - {data.end_time}</div>
          <div><strong>Venue:</strong> {data.venues?.name || 'N/A'} ({data.venues?.location || 'N/A'})</div>
          <div><strong>Expected Participants:</strong> {data.expected_audience || 'N/A'}</div>
          <div className="md:col-span-2"><strong>Description:</strong> {data.description || 'N/A'}</div>
        </CardContent>
      </Card>
      <Card className="print:border-none print:shadow-none">
        <CardHeader><CardTitle className="text-xl">Coordination & Speakers</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><strong>Coordinators:</strong>{renderCoordinators()}</div>
          <div><strong>Speakers/Resource Persons:</strong>{renderSpeakers()}</div>
        </CardContent>
      </Card>
      <Card className="print:border-none print:shadow-none">
        <CardHeader><CardTitle className="text-xl">Event Details & Logistics</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><strong>Objective:</strong> {data.objective || 'N/A'}</div>
          <div><strong>Proposed Outcomes:</strong> {data.proposed_outcomes || 'N/A'}</div>
          <div><strong>Category:</strong> {formatArray(data.category)}</div>
          <div><strong>Target Audience:</strong> {formatArray(data.target_audience)}</div>
          <div><strong>SDG Alignment:</strong> {formatArray(data.sdg_alignment)}</div>
          <div><strong>Budget Estimate:</strong> ₹{data.budget_estimate?.toFixed(2) || '0.00'}</div>
          <div><strong>Funding Source:</strong> {data.budget_estimate > 0 ? formatArray(data.funding_source) : 'N/A (No budget)'}</div>
          <div><strong>Promotion Strategy:</strong> {formatArray(data.promotion_strategy)}</div>
        </CardContent>
      </Card>
      <Card className="print:border-none print:shadow-none">
        <CardHeader><CardTitle className="text-xl">Official Approvals</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ApprovalStatus role="HOD" timestamp={data.hod_approval_at} />
          <ApprovalStatus role="Dean" timestamp={data.dean_approval_at} />
          <ApprovalStatus role="Principal" timestamp={data.principal_approval_at} />
          <div className="pt-2"><strong>Final Remarks:</strong> {data.remarks || 'N/A'}</div>
        </CardContent>
      </Card>
    </div>
  );
};

const EventReportDialog = ({ event, isOpen, onClose }: EventReportDialogProps) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReportData = async () => {
    if (!event || event.status !== 'approved') return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-event-report', {
        body: { event_id: event.id },
      });
      if (error) throw error;
      setReportData(data);
    } catch (error: any) {
      toast.error(`Failed to load report data: ${error.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    } else {
      setReportData(null);
    }
  }, [isOpen, event]);

  const handlePrint = () => {
    if (reportData) {
      window.print();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle>Event Report: {event?.title}</DialogTitle>
            <DialogDescription>
              Official report containing all event details and approval statuses.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="text-center py-10">Loading report...</div>
          ) : reportData ? (
            <div ref={reportRef} className="space-y-4">
              <EventReportContent data={reportData} />
            </div>
          ) : (
            <div className="text-center py-10 text-red-500">
              Error loading report or event is not approved.
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={handlePrint} disabled={loading || !reportData} className="bg-primary hover:bg-primary/90">
              <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hidden content for printing, now outside the Dialog component */}
      <div className="hidden print:block">
        {reportData && <EventReportContent data={reportData} />}
      </div>
    </>
  );
};

export default EventReportDialog;