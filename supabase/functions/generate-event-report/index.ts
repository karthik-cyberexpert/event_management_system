import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGeminiApi(eventDetails: any, registeredUsersCount: number): Promise<string> {
    const prompt = `You are an expert academic event report writer. Generate a professional, comprehensive, and formal 500-word event report based on the following details. The report should cover the event's success, key activities, impact, and future recommendations.

    --- Event Details ---
    Title: ${eventDetails.title}
    Objective: ${eventDetails.objective}
    Proposed Outcomes: ${eventDetails.proposed_outcomes}
    Date: ${eventDetails.event_date}
    Venue: ${eventDetails.venues?.name || eventDetails.other_venue_details}
    Organized by: ${eventDetails.department_club}
    Mode: ${eventDetails.mode_of_event}
    Category: ${eventDetails.category.join(', ')}
    Target Audience: ${eventDetails.target_audience.join(', ')}
    SDG Alignment: ${eventDetails.sdg_alignment.join(', ')}
    Budget Estimate: ₹${eventDetails.budget_estimate?.toFixed(2) || '0.00'}
    Registered Participants: ${registeredUsersCount}
    
    --- Instructions ---
    1. Structure the report with clear headings (e.g., Introduction, Key Highlights, Outcomes and Impact, Conclusion).
    2. Ensure the tone is formal and academic.
    3. The final output must be only the report text, formatted using Markdown.
    `;

    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Gemini API failed: ${response.status} - ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    
    // Extract the text from the response structure
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportText) {
        throw new Error('Gemini API returned an empty or malformed response.');
    }

    return reportText;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with Service Role Key for secure data fetching
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
    
    // Ensure array fields are handled correctly for the prompt
    const eventWithArrays = {
        ...event,
        category: event.category || [],
        target_audience: event.target_audience || [],
        sdg_alignment: event.sdg_alignment || [],
    };

    // 2. Call AI API
    // Note: The posterUrl parameter was removed from callGeminiApi since we are using fetch and not the SDK, 
    // and the prompt doesn't require the URL itself.
    const reportText = await callGeminiApi(eventWithArrays, registered_users_count);

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