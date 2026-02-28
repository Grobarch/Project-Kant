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
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Known spells functions
export async function getKnownSpells(userId) {
    const { data, error } = await supabase
        .from('known_spells')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return { data, error };
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
