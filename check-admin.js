/**
 * Script to check admin status of a user by email.
 * 
 * Usage: 
 *   $env:SUPABASE_SERVICE_KEY = "your-service-role-key"
 *   node check-admin.js k.obstaw+1@gmail.com
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecdrspsbtwddlxnbymkj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
    console.error('❌ Set SUPABASE_SERVICE_KEY env variable first!');
    console.error('   $env:SUPABASE_SERVICE_KEY = "your-service-role-key"');
    process.exit(1);
}

const email = process.argv[2];
if (!email) {
    console.error('❌ Provide email as argument: node check-admin.js user@example.com');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkAdmin() {
    console.log(`\n🔍 Checking admin status for: ${email}\n`);
    
    // First, get user from auth.users via admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
        console.error('❌ Error fetching users:', usersError.message);
        return;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
        console.error(`❌ User with email "${email}" not found in auth.users`);
        return;
    }
    
    console.log(`✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
    
    // Now check profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
        if (profileError.code === 'PGRST116') {
            console.error('❌ Profile not found in profiles table');
            console.log('\n💡 To create profile and set as admin, run:');
            console.log(`   INSERT INTO profiles (id, username, is_admin) VALUES ('${user.id}', '${email.split('@')[0]}', true);`);
        } else {
            console.error('❌ Error fetching profile:', profileError.message);
        }
        return;
    }
    
    console.log(`✅ Profile found:`);
    console.log(`   Username: ${profile.username || '(not set)'}`);
    console.log(`   Is Admin: ${profile.is_admin ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    if (!profile.is_admin) {
        console.log('💡 To set this user as admin, run in Supabase SQL Editor:');
        console.log(`   UPDATE profiles SET is_admin = true WHERE id = '${user.id}';`);
        console.log('');
        console.log('   Or by username:');
        console.log(`   UPDATE profiles SET is_admin = true WHERE username = '${profile.username}';`);
    }
}

checkAdmin().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
