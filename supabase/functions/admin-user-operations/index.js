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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({
                error: 'Missing authorization header'
            }), {
                status: 401,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        const supabaseUser = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: {
                headers: {
                    Authorization: authHeader
                }
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        // Create admin client with service role key
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        const { data: authUserData, error: authUserError } = await supabaseUser.auth.getUser();
        if (authUserError || !authUserData.user) {
            return new Response(JSON.stringify({
                error: 'Unauthorized'
            }), {
                status: 401,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        const { data: callerProfile, error: callerProfileError } = await supabaseAdmin.from('profiles').select('role').eq('id', authUserData.user.id).single();
        if (callerProfileError || !callerProfile || ![
            'Admin',
            'SuperUser'
        ].includes(callerProfile.role)) {
            return new Response(JSON.stringify({
                error: 'Forbidden'
            }), {
                status: 403,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        const { action, userId, data } = await req.json();
        console.log('Admin operation:', { action, userId, data });
        let result;
        switch (action) {
            case 'list_users':
                console.log('Listing users for admin management');
                const [profilesResult, authUsersResult] = await Promise.all([
                    supabaseAdmin.from('profiles').select('*').order('created_at', {
                        ascending: false
                    }),
                    supabaseAdmin.auth.admin.listUsers()
                ]);
                if (profilesResult.error) {
                    result = {
                        error: profilesResult.error
                    };
                    break;
                }
                if (authUsersResult.error) {
                    result = {
                        error: authUsersResult.error
                    };
                    break;
                }
                const profiles = profilesResult.data ?? [];
                const authUsers = authUsersResult.data.users ?? [];
                const profileMap = new Map(profiles.map((profile)=>[
                        profile.id,
                        profile
                    ]));
                const mergedUsers = authUsers.map((authUser)=>{
                    const profile = profileMap.get(authUser.id);
                    return {
                        id: authUser.id,
                        name: profile?.name ?? authUser.user_metadata?.name ?? authUser.email ?? 'Unnamed User',
                        email: profile?.email ?? authUser.email ?? null,
                        role: profile?.role ?? authUser.user_metadata?.role ?? 'Customer',
                        created_at: profile?.created_at ?? authUser.created_at ?? null,
                        updated_at: profile?.updated_at ?? null,
                        needs_password_change: profile?.needs_password_change ?? false,
                        is_deactivated: profile?.is_deactivated ?? false
                    };
                });
                const authUserIds = new Set(authUsers.map((authUser)=>authUser.id));
                const profileOnlyUsers = profiles.filter((profile)=>!authUserIds.has(profile.id)).map((profile)=>({
                        id: profile.id,
                        name: profile.name,
                        email: profile.email,
                        role: profile.role,
                        created_at: profile.created_at ?? null,
                        updated_at: profile.updated_at ?? null,
                        needs_password_change: profile.needs_password_change ?? false,
                        is_deactivated: profile.is_deactivated ?? false
                    }));
                result = {
                    data: [
                        ...mergedUsers,
                        ...profileOnlyUsers
                    ].sort((a, b)=>{
                        const left = a.created_at ? new Date(a.created_at).getTime() : 0;
                        const right = b.created_at ? new Date(b.created_at).getTime() : 0;
                        return right - left;
                    })
                };
                break;
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
