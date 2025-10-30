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

const ReportRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200 last:border-b-0">
    <div className="font-semibold text-sm text-gray-600">{label}</div>
    <div className="col-span-2 text-sm text-gray-800">{children || 'N/A'}</div>
  </div>
);

const EventReportContent = ({ data }: { data: ReportData }) => {
  if (!data) return null;

  const formatArray = (arr: string[] | null | undefined) => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.map(item => item.charAt(0).toUpperCase() + item.slice(1).replace(/_/g, ' ')).join(', ');
  };

  const formatApproval = (timestamp: string | null) => {
    if (!timestamp) return 'Pending';
    return `Approved on ${format(new Date(timestamp), 'PPP p')}`;
  };

  return (
    <div className="p-6 bg-white text-black">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{data.title}</h1>
        <p className="text-lg text-gray-500 mt-1">Event Approval Report</p>
      </header>

      <div className="space-y-1">
        <ReportRow label="Department/Club">{data.department_club}</ReportRow>
        <ReportRow label="Mode of Event"><span className="capitalize">{data.mode_of_event}</span></ReportRow>
        <ReportRow label="Date">{format(new Date(data.event_date), 'PPP')}</ReportRow>
        <ReportRow label="Time">{data.start_time} - {data.end_time}</ReportRow>
        <ReportRow label="Venue">{data.venues?.name} ({data.venues?.location || 'N/A'})</ReportRow>
        <ReportRow label="Expected Participants">{data.expected_audience}</ReportRow>
        <ReportRow label="Description">{data.description}</ReportRow>
        <ReportRow label="Objective">{data.objective}</ReportRow>
        <ReportRow label="Proposed Outcomes">{data.proposed_outcomes}</ReportRow>
        <ReportRow label="Category">{formatArray(data.category)}</ReportRow>
        <ReportRow label="Target Audience">{formatArray(data.target_audience)}</ReportRow>
        <ReportRow label="SDG Alignment">{formatArray(data.sdg_alignment)}</ReportRow>
        <ReportRow label="Coordinators">
          {(data.coordinator_name || []).length > 0 ? (
            <ul className="list-disc list-inside">
              {(data.coordinator_name || []).map((name: string, index: number) => (
                <li key={index}>{name} ({(data.coordinator_contact || [])[index] || 'No contact'})</li>
              ))}
            </ul>
          ) : 'N/A'}
        </ReportRow>
        <ReportRow label="Speakers/Resource Persons">
          {(data.speakers || []).length > 0 ? (
            <ul className="list-disc list-inside">
              {(data.speakers || []).map((name: string, index: number) => (
                <li key={index}><strong>{name}</strong>: {(data.speaker_details || [])[index] || 'No details'}</li>
              ))}
            </ul>
          ) : 'N/A'}
        </ReportRow>
        <ReportRow label="Budget Estimate">₹{data.budget_estimate?.toFixed(2) || '0.00'}</ReportRow>
        <ReportRow label="Funding Source">{data.budget_estimate > 0 ? formatArray(data.funding_source) : 'N/A (No budget)'}</ReportRow>
        <ReportRow label="Promotion Strategy">{formatArray(data.promotion_strategy)}</ReportRow>
        <ReportRow label="HOD Approval">{formatApproval(data.hod_approval_at)}</ReportRow>
        <ReportRow label="Dean Approval">{formatApproval(data.dean_approval_at)}</ReportRow>
        <ReportRow label="Principal Approval">{formatApproval(data.principal_approval_at)}</ReportRow>
        <ReportRow label="Final Remarks">{data.remarks}</ReportRow>
      </div>
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
              Error loading report or event is not approved.
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
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