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
    // Create a Supabase client with the service role key to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const usersData = await req.json()
    // The function can accept a single user object or an array of users
    const users = Array.isArray(usersData) ? usersData : [usersData];
    
    const results = [];

    for (const userData of users) {
      const { email, password, first_name, last_name, role, department } = userData;

      if (!email || !password || !first_name || !last_name || !role) {
        results.push({ email, success: false, error: 'Missing required fields.' });
        continue;
      }

      // 1. Create the user in the authentication system
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the user's email
      });

      if (authError) {
        results.push({ email, success: false, error: authError.message });
        continue;
      }

      const userId = authData.user.id;

      // 2. The `handle_new_user` trigger creates a basic profile. We now update it with the correct details.
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
            first_name, 
            last_name, 
            role, 
            department: (role === 'teacher' || role === 'hod') ? department : null 
        })
        .eq('id', userId);
      
      if (profileError) {
        // If updating the profile fails, roll back by deleting the created auth user to maintain consistency.
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.push({ email, success: false, error: `Failed to update profile: ${profileError.message}` });
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