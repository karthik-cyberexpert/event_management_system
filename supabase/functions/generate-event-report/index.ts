import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Calls the Gemini API to generate a concise objective based on event details.
 * @param eventDetails Object containing title, objective, and description.
 * @returns The generated objective text.
 */
async function callGeminiApi(eventDetails: { title: string, objective: string, description: string }): Promise<string> {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in Supabase secrets.');
    }
    
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Based on the following event details, write a concise and formal "Objective" section for an activity report. The output should be a single, well-written paragraph suitable for an official document.

    --- Event Details ---
    Title: ${eventDetails.title}
    Stated Objective: ${eventDetails.objective}
    Description: ${eventDetails.description}

    --- Instructions ---
    - Synthesize the provided information into a formal objective statement.
    - Do not use markdown, headings, or any special formatting.
    - The output must be only a single block of text.
    `;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            // Ensure the model output is concise
            maxOutputTokens: 500, 
        }
    };

    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = { message: 'Could not parse error response body from Gemini API.' };
        }
        // Throw a detailed error including the HTTP status and any message from the API
        throw new Error(`Gemini API failed with status ${response.status}. Details: ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    const objectiveText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!objectiveText) {
        // Check for specific error messages in the response structure if available
        const errorReason = data.promptFeedback?.blockReason || 'No text generated.';
        throw new Error(`Gemini API returned an empty response. Reason: ${errorReason}`);
    }

    return objectiveText;
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

    const { event_id } = await req.json();

    if (!event_id) {
        return new Response(JSON.stringify({ error: 'Missing event_id' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    // Fetch only the necessary fields
    const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select('title, objective, description')
        .eq('id', event_id)
        .single();

    if (eventError || !event) throw new Error('Event not found or access denied.');
    
    const objectiveText = await callGeminiApi(event);

    return new Response(JSON.stringify({ objective: objectiveText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('AI Report Generation Error:', error);
    // Return the specific error message in the body, even if the status is 500
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})