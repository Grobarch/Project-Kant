import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecdrspsbtwddlxnbymkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZHJzcHNidHdkZGx4bmJ5bWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTA2OTIsImV4cCI6MjA4Nzg2NjY5Mn0.kCdKsZlx9HIOdzPLoFWhrTbUO9io3P80XbnG85lORK8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

// Profile management
export async function ensureProfile(user) {
    console.log('[Supabase] ensureProfile for:', user?.id);
    
    if (!user?.id) {
        console.warn('[Supabase] No user provided to ensureProfile');
        return { data: null, error: null };
    }
    
    const userId = user.id;
    const username = user.email?.split('@')[0] || userId.substring(0, 8);
    
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile check timeout')), 3000);
        });
        
        // Check if profile exists
        const checkPromise = supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();
        
        const { data: existing, error: checkError } = await Promise.race([checkPromise, timeoutPromise]);
        
        if (existing) {
            console.log('[Supabase] Profile already exists');
            return { data: existing, error: null };
        }
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.warn('[Supabase] Error checking profile (non-critical):', checkError.message);
            // Don't block login if profiles table doesn't exist or has issues
            return { data: null, error: null };
        }
        
        // Create profile
        console.log('[Supabase] Creating new profile with username:', username);
        const createPromise = supabase
            .from('profiles')
            .insert([{ 
                id: userId,
                username: username
            }])
            .select()
            .single();
        
        const createTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile creation timeout')), 3000);
        });
        
        const { data, error } = await Promise.race([createPromise, createTimeout]);
        
        if (error) {
            console.warn('[Supabase] Error creating profile (non-critical):', error.message);
            // Don't block login on profile creation failure
            return { data: null, error: null };
        }
        
        console.log('[Supabase] Profile created successfully');
        return { data, error: null };
    } catch (err) {
        console.warn('[Supabase] ensureProfile exception (non-critical):', err.message);
        // Don't block login on any profile-related errors
        return { data: null, error: null };
    }
}

// Known spells functions
export async function getKnownSpells(userId) {
    console.log('[Supabase] getKnownSpells called for user:', userId);
    try {
        const { data, error } = await supabase
            .from('known_spells')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        console.log('[Supabase] getKnownSpells response - data count:', data?.length, 'error:', error?.message);
        return { data, error };
    } catch (err) {
        console.error('[Supabase] getKnownSpells exception:', err);
        return { data: null, error: err };
    }
}

export async function addKnownSpell(userId, spellNamePl, spellNameEn) {
    const { data, error } = await supabase
        .from('known_spells')
        .insert([
            {
                user_id: userId,
                spell_name_pl: spellNamePl,
                spell_name_en: spellNameEn,
            },
        ])
        .select();
    return { data, error };
}

export async function removeKnownSpell(id) {
    const { error } = await supabase
        .from('known_spells')
        .delete()
        .eq('id', id);
    return { error };
}

// Spellbooks functions
export async function getSpellbooks(userId) {
    const { data, error } = await supabase
        .from('spellbooks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return { data, error };
}

export async function createSpellbook(userId, name, reliability = 1) {
    const { data, error } = await supabase
        .from('spellbooks')
        .insert([
            {
                user_id: userId,
                name,
                reliability,
            },
        ])
        .select();
    return { data, error };
}

export async function addSpellToSpellbook(spellbookId, spellNamePl, spellNameEn) {
    const { data, error } = await supabase
        .from('spellbook_spells')
        .insert([
            {
                spellbook_id: spellbookId,
                spell_name_pl: spellNamePl,
                spell_name_en: spellNameEn,
            },
        ])
        .select();
    return { data, error };
}

export async function getSpellbookSpells(spellbookId) {
    const { data, error } = await supabase
        .from('spellbook_spells')
        .select('*')
        .eq('spellbook_id', spellbookId)
        .order('created_at', { ascending: false });
    return { data, error };
}

// Custom spells functions
export async function createCustomSpell(userId, namePl, nameEn, description) {
    const { data, error } = await supabase
        .from('custom_spells')
        .insert([
            {
                user_id: userId,
                name_pl: namePl,
                name_en: nameEn,
                description,
            },
        ])
        .select();
    return { data, error };
}

export async function getCustomSpells(userId) {
    const { data, error } = await supabase
        .from('custom_spells')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return { data, error };
}

// Spells (core data) functions
export async function getAllSpells() {
    const { data, error } = await supabase
        .from('spells')
        .select('*')
        .order('name_pl', { ascending: true });
    return { data, error };
}

export async function insertSpell(spellData) {
    const { data, error } = await supabase
        .from('spells')
        .insert([spellData])
        .select();
    return { data, error };
}

export async function updateSpell(id, spellData) {
    const { data, error } = await supabase
        .from('spells')
        .update(spellData)
        .eq('id', id)
        .select();
    return { data, error };
}

export async function deleteSpell(id) {
    const { error } = await supabase
        .from('spells')
        .delete()
        .eq('id', id);
    return { error };
}

// Profile functions
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
}
