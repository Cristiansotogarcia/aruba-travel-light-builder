import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Generate random temp password
function generateTempPassword(length = 8) {
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
        const { name, email, role, password } = await req.json();
        if (!name || !email || !role) {
            return new Response(JSON.stringify({ success: false, error: 'Name, email, and role are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        // Create Supabase admin client
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        console.log('Creating user with email:', email);
        // Use provided password or generate one if not provided
        const userPassword = password || generateTempPassword();
        console.log('Using password for user creation');
        // Create user with the specified password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: userPassword,
            user_metadata: {
                name: name
            },
            email_confirm: true // Auto-confirm email for admin-created users
        });
        if (authError || !authData.user) {
            console.error('Error creating user:', authError);
            return new Response(JSON.stringify({ success: false, error: authError?.message || 'Failed to create user' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
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
        // Store the temporary password record for tracking
        const { error: tempPasswordError } = await supabaseAdmin
            .from('user_temp_passwords')
            .insert({
            user_id: authData.user.id,
            temp_password: userPassword,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
            is_used: false
        });
        if (tempPasswordError) {
            console.error('Error storing temp password:', tempPasswordError);
            // Don't fail the operation if temp password tracking fails
        }
        console.log('User creation process completed successfully');
        // Return success with user data and the password used
        return new Response(JSON.stringify({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                name: name,
                role: role
            },
            tempPassword: userPassword
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('User creation error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
