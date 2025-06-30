import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    try {
        // Create admin client with service role key
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        const { action, userId, data } = await req.json();
        console.log('Admin operation:', { action, userId, data });
        let result;
        switch (action) {
            case 'delete_user':
                console.log('Deleting user:', userId);
                result = await supabaseAdmin.auth.admin.deleteUser(userId);
                break;
            case 'reset_password':
                console.log('Resetting password for user:', userId);
                result = await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: data.password
                });
                if (!result.error) {
                    // Update profile to mark password change needed
                    await supabaseAdmin
                        .from('profiles')
                        .update({ needs_password_change: true })
                        .eq('id', userId);
                    // Store temp password record
                    await supabaseAdmin
                        .from('user_temp_passwords')
                        .insert({
                        user_id: userId,
                        temp_password: data.password,
                        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                        is_used: false
                    });
                }
                break;
            case 'deactivate_user':
                console.log('Deactivating user:', userId);
                result = await supabaseAdmin
                    .from('profiles')
                    .update({ is_deactivated: true })
                    .eq('id', userId);
                break;
            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
        }
        if (result.error) {
            console.error('Admin operation error:', result.error);
            return new Response(JSON.stringify({ error: result.error.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        console.log('Admin operation successful');
        return new Response(JSON.stringify({ success: true, data: result.data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
