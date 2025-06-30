import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        // Create Supabase client for authentication
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        console.log('Attempting to verify password for email:', email);
        // Try to sign in with the provided credentials to verify the password
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password
        });
        console.log('Authentication result:', {
            success: !!authData.user,
            error: authError?.message
        });
        if (authError || !authData.user) {
            console.log('Authentication failed:', authError?.message);
            return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        // Get user profile information
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
        if (profileError) {
            console.error('Profile lookup error:', profileError);
        }
        // Return success with user data
        return new Response(JSON.stringify({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                profile: profile
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Password verification error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
