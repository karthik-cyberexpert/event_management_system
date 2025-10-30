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
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type EventReportDialogProps = {
  event: any;
  isOpen: boolean;
  onClose: () => void;
};

type ReportData = any;

const ReportRow = ({ label, value }: { label: string; value: any }) => {
  const processValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return 'N/A';
    if (Array.isArray(val)) {
      return val.length > 0
        ? val.map(item => String(item).charAt(0).toUpperCase() + String(item).slice(1).replace(/_/g, ' ')).join(', ')
        : 'N/A';
    }
    if (typeof val === 'string') return val.trim() === '' ? 'N/A' : val;
    if (typeof val === 'object' && val !== null) return val;
    return String(val);
  };

  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-200 last:border-b-0">
      <div className="font-semibold text-sm text-gray-600">{label}</div>
      <div className="col-span-2 text-sm text-gray-800">{processValue(value)}</div>
    </div>
  );
};

const EventReportContent = ({ data }: { data: ReportData }) => {
  if (!data) return null;

  const formatApproval = (timestamp: string | null) => {
    if (!timestamp) return 'Pending';
    return `Approved on ${format(new Date(timestamp), 'PPP p')}`;
  };

  return (
    <div className="p-4 bg-white text-black relative">
      <div className="absolute top-4 right-4 text-sm font-mono bg-gray-100 p-2 rounded border">
        ID: {data.unique_code || 'N/A'}
      </div>
      {/* College Header */}
      <div className="text-center mb-2">
        <h1 className="text-lg font-bold text-gray-800">Adhiyamaan College of Engineering</h1>
        <p className="text-sm text-gray-600">(An Autonomous Institution)</p>
        <p className="text-sm text-gray-600">Dr. M. G. R. Nagar, Hosur</p>
        <h2 className="text-base font-semibold text-gray-700 mt-2">Internal Quality Assurance Cell (IQAC)</h2>
      </div>
      
      {/* Form Title */}
      <h3 className="text-center text-base font-bold underline mb-4">Event Registration and Approval Form</h3>

      {/* Bordered Content */}
      <div className="border border-gray-400">
        {/* Table Headers */}
        <div className="grid grid-cols-3 gap-4 p-2 bg-gray-100 border-b border-gray-400 font-bold text-sm">
          <div className="col-span-1">Section</div>
          <div className="col-span-2">Details</div>
        </div>

        {/* Table Body */}
        <div className="p-2">
          <ReportRow label="Event Title" value={data.title} />
          <ReportRow label="Department/Club" value={data.department_club} />
          <ReportRow label="Mode of Event" value={data.mode_of_event ? String(data.mode_of_event).charAt(0).toUpperCase() + String(data.mode_of_event).slice(1) : 'N/A'} />
          <ReportRow label="Date" value={format(new Date(data.event_date), 'PPP')} />
          <ReportRow label="Time" value={`${data.start_time} - ${data.end_time}`} />
          <ReportRow label="Venue" value={data.venues?.name ? `${data.venues.name} (${data.venues.location || 'N/A'})` : 'N/A'} />
          <ReportRow label="Expected Participants" value={data.expected_audience} />
          <ReportRow label="Description" value={data.description || '(No description was provided for this event)'} />
          <ReportRow label="Objective" value={data.objective} />
          <ReportRow label="Proposed Outcomes" value={data.proposed_outcomes} />
          <ReportRow label="Category" value={data.category} />
          <ReportRow label="Target Audience" value={data.target_audience} />
          <ReportRow label="SDG Alignment" value={data.sdg_alignment} />
          <ReportRow label="Coordinators" value={
            (data.coordinator_name || []).length > 0 ? (
              <div className="space-y-1">
                {(data.coordinator_name || []).map((name: string, index: number) => (
                  <div key={index}>{name} ({(data.coordinator_contact || [])[index] || 'No contact'})</div>
                ))}
              </div>
            ) : null
          } />
          <ReportRow label="Speakers/Resource Persons" value={
            (data.speakers || []).length > 0 ? (
              <div className="space-y-1">
                {(data.speakers || []).map((name: string, index: number) => (
                  <div key={index}><strong>{name}</strong>: {(data.speaker_details || [])[index] || 'No details'}</div>
                ))}
              </div>
            ) : null
          } />
          <ReportRow label="Budget Estimate" value={`₹${data.budget_estimate?.toFixed(2) || '0.00'}`} />
          <ReportRow label="Funding Source" value={data.budget_estimate > 0 ? data.funding_source : 'N/A (No budget)'} />
          <ReportRow label="Promotion Strategy" value={data.promotion_strategy} />
          <ReportRow label="HOD Approval" value={formatApproval(data.hod_approval_at)} />
          <ReportRow label="Dean Approval" value={formatApproval(data.dean_approval_at)} />
          <ReportRow label="Principal Approval" value={formatApproval(data.principal_approval_at)} />
          <ReportRow label="Final Remarks" value={data.remarks} />
        </div>
      </div>
    </div>
  );
};

const EventReportDialog = ({ event, isOpen, onClose }: EventReportDialogProps) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReportData = async () => {
    if (!event) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, description, venue_id, event_date, start_time, end_time, unique_code,
          expected_audience, status, remarks, submitted_by, created_at, updated_at, 
          department_club, coordinator_name, coordinator_contact, mode_of_event, 
          category, objective, sdg_alignment, target_audience, proposed_outcomes, 
          speakers, speaker_details, budget_estimate, funding_source, promotion_strategy, 
          hod_approval_at, dean_approval_at, principal_approval_at,
          venues ( name, location )
        `)
        .eq('id', event.id)
        .single();

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

  const handleDownloadPdf = async () => {
    if (!reportData || !reportRef.current) return;

    setLoading(true);
    toast.loading('Generating PDF...', { id: 'pdf-gen' });

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `${reportData.title.replace(/\s/g, '_')}_Report.pdf`;
      pdf.save(filename);

      toast.success('PDF downloaded successfully!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF.', { id: 'pdf-gen' });
    } finally {
      setLoading(false);
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
          {loading && !reportData ? (
            <div className="text-center py-10">Loading report...</div>
          ) : reportData ? (
            <div ref={reportRef}>
              <EventReportContent data={reportData} />
            </div>
          ) : (
            <div className="text-center py-10 text-red-500">
              Error loading report data.
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleDownloadPdf} 
              disabled={loading || !reportData}
              className="bg-primary hover:bg-primary/90"
            >
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventReportDialog;