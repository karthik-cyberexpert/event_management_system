import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Placeholder for AI API call (Gemini/Google API)
async function callGeminiApi(eventDetails: any, posterUrl: string, registeredUsersCount: number): Promise<string> {
    // NOTE: Replace this placeholder logic with actual API integration.
    // This requires setting up the GEMINI_API_KEY secret and using a library like @google/genai
    // or making a direct fetch request to the Gemini API endpoint.
    
    console.log("Simulating AI report generation...");
    
    const prompt = `Generate a 500-word professional event report based on the following details:
    Title: ${eventDetails.title}
    Objective: ${eventDetails.objective}
    Outcomes: ${eventDetails.proposed_outcomes}
    Date: ${eventDetails.event_date}
    Venue: ${eventDetails.venues?.name || eventDetails.other_venue_details}
    Registered Participants: ${registeredUsersCount}
    Poster URL: ${posterUrl}
    
    The report should cover the event's success, key activities, impact, and future recommendations.`;

    // Since we cannot execute external API calls here, we return a mock report.
    const mockReport = `
      ## Event Report: ${eventDetails.title}

      The event, "${eventDetails.title}", successfully concluded on ${eventDetails.event_date}. Organized by ${eventDetails.department_club}, the primary objective was to ${eventDetails.objective}. The event was held at ${eventDetails.venues?.name || eventDetails.other_venue_details} and attracted ${registeredUsersCount} registered participants.

      ### Key Highlights
      The program commenced with a welcome address, followed by sessions led by distinguished speakers. The content focused heavily on achieving the proposed outcomes, which included ${eventDetails.proposed_outcomes}. The event utilized the promotional poster (available via URL) effectively to reach the target audience (${eventDetails.target_audience.join(', ')}).

      ### Impact and Outcomes
      The session was highly interactive, fostering significant engagement among students and faculty. Feedback indicated a high level of satisfaction with the content and delivery. The event successfully aligned with the Sustainable Development Goals, specifically focusing on ${eventDetails.sdg_alignment.join(', ')}.

      ### Conclusion
      Overall, the event was a resounding success, meeting all stated objectives and contributing positively to the academic environment. Future events should build upon this momentum, potentially expanding the scope to include more industry collaboration.
      
      --- (500 words simulated) ---
    `;

    return mockReport;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event_id, registered_users_count } = await req.json();

    if (!event_id) {
        return new Response(JSON.stringify({ error: 'Missing event_id' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    // 1. Fetch detailed event data
    const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select(`
            *,
            venues ( name, location )
        `)
        .eq('id', event_id)
        .single();

    if (eventError || !event) throw new Error('Event not found or access denied.');

    // 2. Call AI API (using mock function for now)
    const reportText = await callGeminiApi(event, event.poster_url, registered_users_count);

    return new Response(JSON.stringify({ report: reportText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('AI Report Generation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})