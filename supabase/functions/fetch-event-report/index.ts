import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { event_id } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'Missing event_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Initialize Supabase client with Service Role Key to ensure all data is fetched reliably,
    // regardless of RLS policies on specific columns/data types.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch event details with all related data
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        venues ( name, location ),
        submitted_by:profiles ( first_name, last_name, role, department, club )
      `)
      .eq('id', event_id)
      .single();

    if (error) throw error;

    // Security check: Ensure the report is only generated for approved events.
    if (event.status !== 'approved') {
        return new Response(JSON.stringify({ error: 'Event must be approved to generate a report.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        })
    }

    return new Response(JSON.stringify(event), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error fetching event report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})