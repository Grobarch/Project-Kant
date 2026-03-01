/**
 * Migration script: CSV spells → Supabase database
 * Run: node migrate-spells.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://ecdrspsbtwddlxnbymkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZHJzcHNidHdkZGx4bmJ5bWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTA2OTIsImV4cCI6MjA4Nzg2NjY5Mn0.kCdKsZlx9HIOdzPLoFWhrTbUO9io3P80XbnG85lORK8';

// Login credentials for migration (needs authenticated role for INSERT)
const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
    console.error('Usage: node migrate-spells.js <email> <password>');
    console.error('Example: node migrate-spells.js user@example.com mypassword');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple CSV parser (no dependency on Papa Parse in Node)
function parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        
        if (inQuotes) {
            if (char === '"' && next === '"') {
                current += '"';
                i++; // skip next quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(current.trim());
                current = '';
            } else if (char === '\n' || (char === '\r' && next === '\n')) {
                row.push(current.trim());
                current = '';
                if (row.some(cell => cell !== '')) {
                    rows.push(row);
                }
                row = [];
                if (char === '\r') i++; // skip \n after \r
            } else {
                current += char;
            }
        }
    }
    
    // Last row
    if (current || row.length > 0) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) {
            rows.push(row);
        }
    }
    
    // Convert to objects using headers
    if (rows.length < 2) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = row[i] || '';
        });
        return obj;
    });
}

function mapKant(spell) {
    return {
        type: 'kant',
        source: spell['Źródło'] || null,
        name_en: spell['Nazwa'] || '',
        name_pl: spell['NazwaPL'] || '',
        attribute: spell['Cecha'] || null,
        min_hand: spell['Min. Ręka'] || null,
        casting: spell['Rzucanie'] || null,
        duration: spell['Czas'] || null,
        range: spell['Zasięg'] || null,
        description: spell['Opis'] || null,
        effect_ace: spell['As'] || null,
        effect_pair: spell['Para'] || null,
        effect_face_pair: spell['Para Figur'] || null,
        effect_two_pair: spell['Dwie Pary'] || null,
        effect_three_of_kind: spell['Trójka'] || null,
        effect_straight: spell['Strit'] || null,
        effect_flush: spell['Kolor'] || null,
        effect_full_house: spell['Ful'] || null,
        effect_four_of_kind: spell['Kareta'] || null,
        effect_poker: spell['Poker'] || null,
        effect_royal_poker: spell['Królewski Poker'] || null,
    };
}

function mapSztuka(spell) {
    return {
        type: 'sztuka',
        source: spell['Źródło'] || null,
        name_en: spell['Nazwa'] || '',
        name_pl: spell['NazwaPL'] || '',
        attribute: spell['Cecha'] || null,
        min_hand: null,
        casting: null,
        duration: null,
        range: null,
        description: spell['Opis'] || null,
        effect_ace: null,
        effect_pair: null,
        effect_face_pair: null,
        effect_two_pair: null,
        effect_three_of_kind: null,
        effect_straight: null,
        effect_flush: null,
        effect_full_house: null,
        effect_four_of_kind: null,
        effect_poker: null,
        effect_royal_poker: null,
    };
}

async function main() {
    console.log('=== Migracja zaklęć do Supabase ===\n');
    
    // 1. Authenticate
    console.log('1. Logowanie...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD,
    });
    
    if (authError) {
        console.error('Błąd logowania:', authError.message);
        process.exit(1);
    }
    console.log('   Zalogowano jako:', authData.user.email);
    
    // 2. Read CSV files
    console.log('\n2. Wczytywanie CSV...');
    
    const kantyPath = path.join(__dirname, 'Dane', 'kanty_v2 - kanty_v2.csv');
    const sztuPath = path.join(__dirname, 'Dane', 'kanty_v2 - Sztuczki.csv');
    
    const kantyText = fs.readFileSync(kantyPath, 'utf-8');
    const sztuText = fs.readFileSync(sztuPath, 'utf-8');
    
    const kanty = parseCSV(kantyText);
    const sztuczki = parseCSV(sztuText);
    
    console.log(`   Kantów: ${kanty.length}`);
    console.log(`   Sztuczek: ${sztuczki.length}`);
    
    // 3. Map to DB format
    console.log('\n3. Mapowanie danych...');
    const kantyMapped = kanty.map(mapKant).filter(s => s.name_en || s.name_pl);
    const sztuMapped = sztuczki.map(mapSztuka).filter(s => s.name_en || s.name_pl);
    
    const allSpells = [...kantyMapped, ...sztuMapped];
    console.log(`   Łącznie do wstawienia: ${allSpells.length}`);
    
    // 4. Check for existing data
    console.log('\n4. Sprawdzanie istniejących danych...');
    const { count } = await supabase
        .from('spells')
        .select('*', { count: 'exact', head: true });
    
    if (count > 0) {
        console.log(`   Tabela 'spells' zawiera już ${count} rekordów.`);
        console.log('   Usuwam stare dane przed migracją...');
        
        const { error: deleteError } = await supabase
            .from('spells')
            .delete()
            .neq('id', 0); // Delete all
        
        if (deleteError) {
            console.error('   Błąd usuwania:', deleteError.message);
            process.exit(1);
        }
        console.log('   Stare dane usunięte.');
    } else {
        console.log('   Tabela pusta, kontynuuję.');
    }
    
    // 5. Insert in batches of 50
    console.log('\n5. Wstawianie do bazy danych...');
    const BATCH_SIZE = 50;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < allSpells.length; i += BATCH_SIZE) {
        const batch = allSpells.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase
            .from('spells')
            .insert(batch)
            .select('id');
        
        if (error) {
            console.error(`   Błąd batch ${i}-${i + batch.length}:`, error.message);
            errors += batch.length;
            
            // Try inserting one by one to find problematic records
            for (const spell of batch) {
                const { error: singleError } = await supabase
                    .from('spells')
                    .insert(spell)
                    .select('id');
                
                if (singleError) {
                    console.error(`   ✗ "${spell.name_pl}" (${spell.name_en}): ${singleError.message}`);
                } else {
                    inserted++;
                    errors--;
                }
            }
        } else {
            inserted += data.length;
            process.stdout.write(`\r   Wstawiono: ${inserted}/${allSpells.length}`);
        }
    }
    
    console.log(`\n\n=== MIGRACJA ZAKOŃCZONA ===`);
    console.log(`   Wstawiono: ${inserted}`);
    console.log(`   Błędy: ${errors}`);
    console.log(`   Łącznie w CSV: ${allSpells.length}`);
    
    // 6. Verify
    console.log('\n6. Weryfikacja...');
    const { count: finalCount } = await supabase
        .from('spells')
        .select('*', { count: 'exact', head: true });
    console.log(`   Rekordów w bazie: ${finalCount}`);
    
    if (finalCount === allSpells.length) {
        console.log('   ✓ Migracja poprawna!');
    } else {
        console.log(`   ⚠ Oczekiwano ${allSpells.length}, jest ${finalCount}`);
    }
    
    await supabase.auth.signOut();
    console.log('\n   Wylogowano. Gotowe!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
