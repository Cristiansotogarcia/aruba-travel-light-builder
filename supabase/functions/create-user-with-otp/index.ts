
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate random temp password
function generateTempPassword(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, role } = await req.json();

    if (!name || !email || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name, email, and role are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating user with email:', email);

    // Generate temporary password
    const tempPassword = generateTempPassword();
    console.log('Generated temp password for user:', tempPassword);

    // Create user with temporary password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: {
        name: name
      },
      email_confirm: true // Auto-confirm email for admin-created users
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || 'Failed to create user' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User created successfully:', authData.user.id);

    // Update the user's profile with role and password change requirement
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role,
        needs_password_change: true 
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the entire operation, but log the error
    }

    // Store the temporary password
    const { error: tempPasswordError } = await supabaseAdmin
      .from('user_temp_passwords')
      .insert({
        user_id: authData.user.id,
        temp_password: tempPassword,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
        is_used: false
      });

    if (tempPasswordError) {
      console.error('Error storing temp password:', tempPasswordError);
      // Clean up: delete the created user if we can't store the temp password
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store temporary password' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User creation process completed successfully');

    // Return success with user data and temp password
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name,
          role: role
        },
        tempPassword: tempPassword
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('User creation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
