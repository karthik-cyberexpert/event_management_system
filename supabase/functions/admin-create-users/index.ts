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

      const profileDepartment = (role === 'coordinator' || role === 'hod') ? (department || null) : null;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        results.push({ email, success: false, error: authError.message });
        continue;
      }

      const userId = authData.user.id;

      // Use upsert to handle cases where a trigger might have already created a basic profile.
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          first_name,
          last_name,
          role: role as string,
          department: profileDepartment,
        });

      if (profileError) {
        // If profile upsert fails, delete the auth user to avoid orphans.
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.push({ email, success: false, error: `Failed to create profile: ${profileError.message}` });
        continue;
      }

      results.push({ email, success: true });
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