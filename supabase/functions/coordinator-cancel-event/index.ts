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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    // 1. Get the user ID and check role (Coordinator)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'coordinator') {
        throw new Error('Access Denied: Only coordinators can cancel events.');
    }

    const { event_id, cancellation_reason } = await req.json();

    if (!event_id || !cancellation_reason) {
        throw new Error('Missing event ID or cancellation reason.');
    }

    // 2. Use Admin client to bypass RLS and perform the update
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Verify the event belongs to the coordinator and is cancellable
    const { data: event, error: eventFetchError } = await supabaseAdmin
        .from('events')
        .select('submitted_by, status')
        .eq('id', event_id)
        .single();

    if (eventFetchError || !event) throw new Error('Event not found.');
    
    if (event.submitted_by !== user.id) {
        throw new Error('Unauthorized: Event does not belong to this coordinator.');
    }

    if (event.status === 'rejected' || event.status === 'cancelled') {
        throw new Error('Event is already rejected or cancelled.');
    }

    // 4. Perform the cancellation update
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({ 
        status: 'cancelled', 
        remarks: `CANCELLATION REASON: ${cancellation_reason}`,
      })
      .eq('id', event_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Cancellation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})