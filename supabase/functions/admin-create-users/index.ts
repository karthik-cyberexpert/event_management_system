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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const usersData = await req.json()
    const users = Array.isArray(usersData) ? usersData : [usersData];
    
    const results = [];

    for (const userData of users) {
      const { email, password, first_name, last_name, role, department } = userData;

      if (!email || !password || !first_name || !last_name || !role) {
        results.push({ email, success: false, error: 'Missing required fields.' });
        continue;
      }

      // Department is only relevant for certain roles
      const profileDepartment = (role === 'coordinator' || role === 'hod') ? (department || null) : null;

      // Create the user in auth.users and pass profile data in user_metadata.
      // This allows the `handle_new_user` trigger to create the profile correctly.
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Automatically confirm user's email
        user_metadata: {
          first_name,
          last_name,
          role,
          department: profileDepartment,
        },
      });

      if (authError) {
        // If user creation fails, report the error.
        results.push({ email, success: false, error: authError.message });
      } else {
        // If user creation succeeds, the trigger will handle profile creation.
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