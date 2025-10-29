import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_ROLES = ['admin', 'coordinator', 'hod', 'dean', 'principal'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const usersData = await req.json()
    const users = Array.isArray(usersData) ? usersData : [usersData];
    
    const results = [];

    for (const userData of users) {
      const { email, password, first_name, last_name, role, department, club } = userData;

      // --- Validation ---
      if (!email || !password || !first_name || !last_name || !role) {
        results.push({ email: email || 'N/A', success: false, error: 'Missing required fields (email, password, first_name, last_name, role).' });
        continue;
      }

      if (!VALID_ROLES.includes(role)) {
        results.push({ email, success: false, error: `Invalid role: '${role}'. Must be one of: ${VALID_ROLES.join(', ')}.` });
        continue;
      }
      // --- End Validation ---

      const profileDepartment = (role === 'coordinator' || role === 'hod') ? (department || null) : null;
      const profileClub = (role === 'coordinator') ? (club || null) : null;

      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          role,
          department: profileDepartment,
          club: profileClub,
        },
      });

      if (authError) {
        results.push({ email, success: false, error: authError.message });
      } else {
        results.push({ email, success: true });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})