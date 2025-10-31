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
      const { email, first_name, last_name, role, department, club, professional_society, password } = userData;

      // --- Validation ---
      if (!email || !first_name || !last_name || !role || !password) {
        results.push({ email: email || 'N/A', success: false, error: 'Missing required fields (email, first_name, last_name, role, password).' });
        continue;
      }

      if (!VALID_ROLES.includes(role)) {
        results.push({ email, success: false, error: `Invalid role: '${role}'. Must be one of: ${VALID_ROLES.join(', ')}.` });
        continue;
      }
      
      if (role === 'coordinator' && !department && !club && !professional_society) {
        results.push({ email, success: false, error: 'Coordinator must be assigned to a Department, Club, or Professional Society.' });
        continue;
      }
      // --- End Validation ---

      const profileDepartment = (role === 'coordinator' || role === 'hod') ? (department || null) : null;
      const profileClub = (role === 'coordinator') ? (club || null) : null;
      const profileSociety = (role === 'coordinator') ? (professional_society || null) : null;

      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Automatically confirm the email since admin is creating it
        user_metadata: {
          first_name,
          last_name,
          role,
          department: profileDepartment,
          club: profileClub,
          professional_society: profileSociety,
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