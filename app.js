// Import Supabase client and auth functions
import { supabase, signIn, signOut, getCurrentUser, ensureProfile, getKnownSpells, addKnownSpell, removeKnownSpell, createSpellbook, getSpellbooks, addSpellToSpellbook, getSpellbookSpells, createCustomSpell, getCustomSpells, getAllSpells, insertSpell, updateSpell, deleteSpell, getProfile } from './supabase.js';

// Data storage
let allSpells = [];
let filteredSpells = [];
let filteredCardsSpells = [];

// User state
let currentUser = null;
let isAdmin = false;
let knownSpells = [];
let knownSpellActionInProgress = false;
let userSpellbooks = [];
let currentSpellForSpellbook = null; // Track which spell is being added to spellbook
let editingSpellId = null; // Track which spell is being edited (null = add mode)
let userDataLoaded = false; // Prevent double-loading from checkUserOnLoad + onAuthStateChange
const FORCE_LOGOUT_KEY = 'project-kant-force-logout';
const PROFILE_ENSURED_KEY = 'project-kant-profile-ok';

// Sorting state
let currentSortColumn = 'NazwaPL';
let currentSortDirection = 'asc';

// DOM Elements - Table View
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const sourceFilter = document.getElementById('sourceFilter');
const featureFilter = document.getElementById('featureFilter');
const resetBtn = document.getElementById('resetFilters');
const spellsBody = document.getElementById('spellsBody');
const resultsCount = document.getElementById('resultsCount');

// DOM Elements - Card View
const cardSearchInput = document.getElementById('cardSearchInput');
const omniboxSuggestions = document.getElementById('omniboxSuggestions');
const gameCard = document.getElementById('gameCard');
const knownSpellsPanel = document.getElementById('knownSpellsPanel');
const knownSpellsCount = document.getElementById('knownSpellsCount');
const knownSpellsHint = document.getElementById('knownSpellsHint');
const knownSpellsList = document.getElementById('knownSpellsList');

// DOM Elements - Spellbooks
const spellbooksPanel = document.getElementById('spellbooksPanel');
const spellbooksList = document.getElementById('spellbooksList');
const spellbooksHint = document.getElementById('spellbooksHint');
const createSpellbookBtn = document.getElementById('createSpellbookBtn');
const createSpellbookModal = document.getElementById('createSpellbookModal');
const closeSpellbookModal = document.getElementById('closeSpellbookModal');
const createSpellbookForm = document.getElementById('createSpellbookForm');
const spellbookNameInput = document.getElementById('spellbookName');
const spellbookReliabilityInput = document.getElementById('spellbookReliability');
const reliabilityValueDisplay = document.getElementById('reliabilityValue');
const spellbookDetailsModal = document.getElementById('spellbookDetailsModal');
const closeSpellbookDetailsModal = document.getElementById('closeSpellbookDetailsModal');
const addToSpellbookModal = document.getElementById('addToSpellbookModal');
const closeAddToSpellbookModal = document.getElementById('closeAddToSpellbookModal');

// DOM Elements - Add/Edit Spell
const addSpellBtn = document.getElementById('addSpellBtn');
const addSpellModal = document.getElementById('addSpellModal');
const addSpellModalTitle = document.getElementById('addSpellModalTitle');
const closeAddSpellModal = document.getElementById('closeAddSpellModal');
const addSpellForm = document.getElementById('addSpellForm');
const newSpellType = document.getElementById('newSpellType');
const effectsSection = document.getElementById('effectsSection');

// DOM Elements - Management Panel
const manageTabBtn = document.getElementById('manageTabBtn');
const manageSearchInput = document.getElementById('manageSearchInput');
const manageTypeFilter = document.getElementById('manageTypeFilter');
const manageOwnerFilter = document.getElementById('manageOwnerFilter');
const manageOwnerFilterGroup = document.getElementById('manageOwnerFilterGroup');
const manageSpellsList = document.getElementById('manageSpellsList');
const manageResultsCount = document.getElementById('manageResultsCount');
const manageRoleBadge = document.getElementById('manageRoleBadge');
const manageDescription = document.getElementById('manageDescription');

// Card view state
let currentCardIndex = 0;
let allCardsForView = [];

// DOM Elements - Modal & Tabs
const detailsPanel = document.getElementById('detailsPanel');
const closeDetailsBtn = document.getElementById('closeDetails');
const tabButtons = document.querySelectorAll('.tab-btn');
const viewSections = document.querySelectorAll('.view-section');

// Poker hand names
const HAND_NAMES = ['As', 'Para', 'Para Figur', 'Dwie Pary', 'Trójka', 'Strit', 'Kolor', 'Ful', 'Kareta', 'Poker', 'Królewski Poker'];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    loadData();
    setupAuthStateListener();
});

// Setup event listeners
function setupEventListeners() {
    // Auth UI
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });
    }

    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    // Table view filters
    searchInput.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    sourceFilter.addEventListener('change', applyFilters);
    featureFilter.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', resetFilters);

    // Table sorting
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            handleSort(column);
        });
    });

    // Card view omnibox search
    cardSearchInput.addEventListener('input', handleOmniboxInput);
    cardSearchInput.addEventListener('keydown', handleOmniboxKeydown);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.omnibox-container')) {
            omniboxSuggestions.classList.remove('visible');
        }
    });

    // Modal
    closeDetailsBtn.addEventListener('click', () => {
        detailsPanel.style.display = 'none';
    });
    detailsPanel.addEventListener('click', (e) => {
        if (e.target === detailsPanel) {
            detailsPanel.style.display = 'none';
        }
    });

    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Spellbooks
    if (createSpellbookBtn) {
        createSpellbookBtn.addEventListener('click', () => {
            createSpellbookModal.style.display = 'block';
        });
    }

    if (closeSpellbookModal) {
        closeSpellbookModal.addEventListener('click', () => {
            createSpellbookModal.style.display = 'none';
        });
    }

    if (createSpellbookForm) {
        createSpellbookForm.addEventListener('submit', handleCreateSpellbook);
    }

    if (spellbookReliabilityInput && reliabilityValueDisplay) {
        spellbookReliabilityInput.addEventListener('input', (e) => {
            reliabilityValueDisplay.textContent = e.target.value;
        });
    }

    if (closeSpellbookDetailsModal) {
        closeSpellbookDetailsModal.addEventListener('click', () => {
            spellbookDetailsModal.style.display = 'none';
        });
    }

    if (closeAddToSpellbookModal) {
        closeAddToSpellbookModal.addEventListener('click', () => {
            addToSpellbookModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === createSpellbookModal) {
            createSpellbookModal.style.display = 'none';
        }
        if (event.target === spellbookDetailsModal) {
            spellbookDetailsModal.style.display = 'none';
        }
        if (event.target === addToSpellbookModal) {
            addToSpellbookModal.style.display = 'none';
        }
        if (event.target === addSpellModal) {
            addSpellModal.style.display = 'none';
        }
    });

    // Add Spell modal
    if (addSpellBtn) {
        addSpellBtn.addEventListener('click', () => {
            openAddSpellModal();
        });
    }

    if (closeAddSpellModal) {
        closeAddSpellModal.addEventListener('click', () => {
            addSpellModal.style.display = 'none';
        });
    }

    if (newSpellType) {
        newSpellType.addEventListener('change', () => {
            const isSztuka = newSpellType.value === 'sztuka';
            effectsSection.classList.toggle('hidden', isSztuka);
            // Hide/show kant-specific fields
            document.getElementById('minHandGroup').style.display = isSztuka ? 'none' : '';
            document.getElementById('castingGroup').style.display = isSztuka ? 'none' : '';
            document.getElementById('durationGroup').style.display = isSztuka ? 'none' : '';
            document.getElementById('rangeGroup').style.display = isSztuka ? 'none' : '';
        });
    }

    if (addSpellForm) {
        addSpellForm.addEventListener('submit', handleAddSpell);
    }

    // Management panel search/filter
    if (manageSearchInput) {
        manageSearchInput.addEventListener('input', renderManageSpellsList);
    }
    if (manageTypeFilter) {
        manageTypeFilter.addEventListener('change', renderManageSpellsList);
    }
    if (manageOwnerFilter) {
        manageOwnerFilter.addEventListener('change', renderManageSpellsList);
    }
}

// DB column → legacy CSV property name mapping
const EFFECT_COLUMN_MAP = {
    effect_ace: 'As',
    effect_pair: 'Para',
    effect_face_pair: 'Para Figur',
    effect_two_pair: 'Dwie Pary',
    effect_three_of_kind: 'Trójka',
    effect_straight: 'Strit',
    effect_flush: 'Kolor',
    effect_full_house: 'Ful',
    effect_four_of_kind: 'Kareta',
    effect_poker: 'Poker',
    effect_royal_poker: 'Królewski Poker',
};

function mapDbSpellToLegacy(dbSpell) {
    const spell = {
        id: dbSpell.id,
        type: dbSpell.type,
        created_by: dbSpell.created_by || null,
        'Źródło': dbSpell.source || '',
        'Nazwa': dbSpell.name_en || '',
        'NazwaPL': dbSpell.name_pl || '',
        'Cecha': dbSpell.attribute || '',
        'Min. Ręka': dbSpell.min_hand || (dbSpell.type === 'sztuka' ? '-' : ''),
        'Rzucanie': dbSpell.casting || (dbSpell.type === 'sztuka' ? '-' : ''),
        'Czas': dbSpell.duration || (dbSpell.type === 'sztuka' ? '-' : ''),
        'Zasięg': dbSpell.range || (dbSpell.type === 'sztuka' ? '-' : ''),
        'Opis': dbSpell.description || '',
        nazwaLower: (dbSpell.name_pl || '').toLowerCase(),
        nazwaEnLower: (dbSpell.name_en || '').toLowerCase(),
    };
    
    // Map effect columns
    for (const [dbCol, legacyName] of Object.entries(EFFECT_COLUMN_MAP)) {
        spell[legacyName] = dbSpell[dbCol] || '';
    }
    
    return spell;
}

// Open the add/edit spell modal
function openAddSpellModal(spellToEdit = null) {
    addSpellForm.reset();
    editingSpellId = null;
    effectsSection.classList.remove('hidden');
    document.getElementById('addSpellError').style.display = 'none';
    document.getElementById('addSpellSuccess').style.display = 'none';
    
    // Reset hidden fields visibility
    document.getElementById('minHandGroup').style.display = '';
    document.getElementById('castingGroup').style.display = '';
    document.getElementById('durationGroup').style.display = '';
    document.getElementById('rangeGroup').style.display = '';

    if (spellToEdit) {
        // Edit mode - populate form
        editingSpellId = spellToEdit.id;
        addSpellModalTitle.textContent = `Edytuj: ${spellToEdit.NazwaPL}`;
        
        document.getElementById('newSpellType').value = spellToEdit.type || 'kant';
        document.getElementById('newSpellSource').value = spellToEdit['Źródło'] || '';
        document.getElementById('newSpellNamePL').value = spellToEdit.NazwaPL || '';
        document.getElementById('newSpellNameEN').value = spellToEdit.Nazwa || '';
        document.getElementById('newSpellAttribute').value = spellToEdit.Cecha || '';
        document.getElementById('newSpellMinHand').value = spellToEdit['Min. Ręka'] || '';
        document.getElementById('newSpellCasting').value = spellToEdit.Rzucanie || '';
        document.getElementById('newSpellDuration').value = spellToEdit.Czas || '';
        document.getElementById('newSpellRange').value = spellToEdit.Zasięg || '';
        document.getElementById('newSpellDescription').value = spellToEdit.Opis || '';
        
        // Effects
        document.getElementById('effectAce').value = spellToEdit['As'] || '';
        document.getElementById('effectPair').value = spellToEdit['Para'] || '';
        document.getElementById('effectFacePair').value = spellToEdit['Para Figur'] || '';
        document.getElementById('effectTwoPair').value = spellToEdit['Dwie Pary'] || '';
        document.getElementById('effectThreeOfKind').value = spellToEdit['Trójka'] || '';
        document.getElementById('effectStraight').value = spellToEdit['Strit'] || '';
        document.getElementById('effectFlush').value = spellToEdit['Kolor'] || '';
        document.getElementById('effectFullHouse').value = spellToEdit['Ful'] || '';
        document.getElementById('effectFourOfKind').value = spellToEdit['Kareta'] || '';
        document.getElementById('effectPoker').value = spellToEdit['Poker'] || '';
        document.getElementById('effectRoyalPoker').value = spellToEdit['Królewski Poker'] || '';

        // Toggle visibility based on type
        const isSztuka = spellToEdit.type === 'sztuka';
        effectsSection.classList.toggle('hidden', isSztuka);
        document.getElementById('minHandGroup').style.display = isSztuka ? 'none' : '';
        document.getElementById('castingGroup').style.display = isSztuka ? 'none' : '';
        document.getElementById('durationGroup').style.display = isSztuka ? 'none' : '';
        document.getElementById('rangeGroup').style.display = isSztuka ? 'none' : '';
    } else {
        // Add mode
        addSpellModalTitle.textContent = 'Dodaj nowy kant / sztuczkę';
    }

    addSpellModal.style.display = 'flex';
}

// Collect form data into DB-format spell object
function collectSpellFormData() {
    const type = newSpellType.value;
    const isSztuka = type === 'sztuka';

    const spellData = {
        type,
        source: document.getElementById('newSpellSource').value.trim(),
        name_pl: document.getElementById('newSpellNamePL').value.trim(),
        name_en: document.getElementById('newSpellNameEN').value.trim(),
        attribute: document.getElementById('newSpellAttribute').value.trim() || null,
        min_hand: isSztuka ? '-' : (document.getElementById('newSpellMinHand').value.trim() || null),
        casting: isSztuka ? '-' : (document.getElementById('newSpellCasting').value.trim() || null),
        duration: isSztuka ? '-' : (document.getElementById('newSpellDuration').value.trim() || null),
        range: isSztuka ? '-' : (document.getElementById('newSpellRange').value.trim() || null),
        description: document.getElementById('newSpellDescription').value.trim() || null,
    };

    if (!isSztuka) {
        spellData.effect_ace = document.getElementById('effectAce').value.trim() || null;
        spellData.effect_pair = document.getElementById('effectPair').value.trim() || null;
        spellData.effect_face_pair = document.getElementById('effectFacePair').value.trim() || null;
        spellData.effect_two_pair = document.getElementById('effectTwoPair').value.trim() || null;
        spellData.effect_three_of_kind = document.getElementById('effectThreeOfKind').value.trim() || null;
        spellData.effect_straight = document.getElementById('effectStraight').value.trim() || null;
        spellData.effect_flush = document.getElementById('effectFlush').value.trim() || null;
        spellData.effect_full_house = document.getElementById('effectFullHouse').value.trim() || null;
        spellData.effect_four_of_kind = document.getElementById('effectFourOfKind').value.trim() || null;
        spellData.effect_poker = document.getElementById('effectPoker').value.trim() || null;
        spellData.effect_royal_poker = document.getElementById('effectRoyalPoker').value.trim() || null;
    } else {
        // Clear effects for sztuczka
        spellData.effect_ace = null;
        spellData.effect_pair = null;
        spellData.effect_face_pair = null;
        spellData.effect_two_pair = null;
        spellData.effect_three_of_kind = null;
        spellData.effect_straight = null;
        spellData.effect_flush = null;
        spellData.effect_full_house = null;
        spellData.effect_four_of_kind = null;
        spellData.effect_poker = null;
        spellData.effect_royal_poker = null;
    }

    return spellData;
}

// Handle add or edit spell form submission
async function handleAddSpell(e) {
    e.preventDefault();

    const errorEl = document.getElementById('addSpellError');
    const successEl = document.getElementById('addSpellSuccess');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    const spellData = collectSpellFormData();

    // Basic validation
    if (!spellData.name_pl || !spellData.name_en || !spellData.source) {
        errorEl.textContent = 'Nazwa PL, EN i Źródło są wymagane.';
        errorEl.style.display = 'block';
        return;
    }

    const submitBtn = addSpellForm.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Zapisywanie...';

    try {
        let data, error;

        if (editingSpellId) {
            // UPDATE mode
            ({ data, error } = await updateSpell(editingSpellId, spellData));
        } else {
            // INSERT mode - include created_by if column exists
            spellData.created_by = currentUser?.id || null;
            ({ data, error } = await insertSpell(spellData));

            // If created_by column doesn't exist yet, retry without it
            if (error && error.message && error.message.includes('created_by')) {
                console.warn('[handleAddSpell] created_by column not found, retrying without it');
                delete spellData.created_by;
                ({ data, error } = await insertSpell(spellData));
            }
        }

        if (error) {
            if (error.code === '23505') {
                errorEl.textContent = 'Zaklęcie o takiej nazwie już istnieje!';
            } else {
                errorEl.textContent = `Błąd: ${error.message}`;
            }
            errorEl.style.display = 'block';
            return;
        }

        if (data && data[0]) {
            const updatedSpell = mapDbSpellToLegacy(data[0]);

            if (editingSpellId) {
                // Replace in allSpells
                const idx = allSpells.findIndex(s => s.id === editingSpellId);
                if (idx !== -1) allSpells[idx] = updatedSpell;
                successEl.textContent = `Zaktualizowano: ${spellData.name_pl}`;
            } else {
                allSpells.push(updatedSpell);
                successEl.textContent = `Dodano: ${spellData.name_pl} (${spellData.name_en})`;
            }

            allSpells.sort((a, b) => a.NazwaPL.localeCompare(b.NazwaPL, 'pl'));
            populateFilters();
            applyFilters();
            renderManageSpellsList();
        }

        successEl.style.display = 'block';

        setTimeout(() => {
            addSpellModal.style.display = 'none';
            addSpellForm.reset();
            editingSpellId = null;
        }, 1200);

    } catch (err) {
        errorEl.textContent = `Nieoczekiwany błąd: ${err.message}`;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Zapisz';
    }
}

// ===== MANAGEMENT PANEL =====

// Check if current user can edit a spell
function canEditSpell(spell) {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return spell.created_by === currentUser.id;
}

// Check if current user can delete a spell
function canDeleteSpell(spell) {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return spell.created_by === currentUser.id;
}

// Get the list of spells visible in management panel
function getManageableSpells() {
    if (isAdmin) {
        // Admin sees everything
        return allSpells;
    }
    // Regular user sees only their own created spells
    if (!currentUser) return [];
    return allSpells.filter(spell => spell.created_by === currentUser.id);
}

// Render management panel spells list
function renderManageSpellsList() {
    if (!manageSpellsList) return;

    const manageableSpells = getManageableSpells();
    const searchTerm = (manageSearchInput?.value || '').toLowerCase().trim();
    const typeFilterVal = manageTypeFilter?.value || '';
    const ownerFilterVal = manageOwnerFilter?.value || '';

    let filtered = manageableSpells.filter(spell => {
        const matchesSearch = searchTerm === '' ||
            spell.nazwaLower.includes(searchTerm) ||
            spell.nazwaEnLower.includes(searchTerm);
        const matchesType = typeFilterVal === '' || spell.type === typeFilterVal;
        let matchesOwner = true;
        if (ownerFilterVal === 'base') {
            matchesOwner = spell.created_by === null;
        } else if (ownerFilterVal === 'user') {
            matchesOwner = spell.created_by !== null;
        }
        return matchesSearch && matchesType && matchesOwner;
    });

    if (manageResultsCount) {
        manageResultsCount.textContent = `Wyników: ${filtered.length} / ${manageableSpells.length}`;
    }

    if (filtered.length === 0) {
        manageSpellsList.innerHTML = '<div class="manage-empty">Brak kantów do wyświetlenia.</div>';
        return;
    }

    manageSpellsList.innerHTML = filtered.map(spell => {
        const ownerLabel = spell.created_by === null ? 'Bazowy' :
            (spell.created_by === currentUser?.id ? 'Twój' : 'Użytkownik');
        const canEdit = canEditSpell(spell);
        const canDel = canDeleteSpell(spell);

        return `
            <div class="manage-spell-item" data-spell-id="${spell.id}">
                <div class="manage-spell-info">
                    <div class="manage-spell-name">${spell.NazwaPL || spell.Nazwa}</div>
                    <div class="manage-spell-meta">
                        <span class="type-badge ${spell.type}" style="font-size:0.75em;padding:2px 6px;">${spell.type === 'kant' ? 'KANT' : 'SZTUCZKA'}</span>
                        <span>${spell.Nazwa || ''}</span>
                        <span>· ${spell['Źródło'] || '-'}</span>
                        <span class="manage-spell-owner">· ${ownerLabel}</span>
                    </div>
                </div>
                <div class="manage-spell-actions">
                    ${canEdit ? `<button class="btn-edit-spell" data-id="${spell.id}">✏️ Edytuj</button>` : ''}
                    ${canDel ? `<button class="btn-delete-spell-manage" data-id="${spell.id}">🗑️ Usuń</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    manageSpellsList.querySelectorAll('.btn-edit-spell').forEach(btn => {
        btn.addEventListener('click', () => {
            const spellId = parseInt(btn.getAttribute('data-id'));
            const spell = allSpells.find(s => s.id === spellId);
            if (spell) openAddSpellModal(spell);
        });
    });

    manageSpellsList.querySelectorAll('.btn-delete-spell-manage').forEach(btn => {
        btn.addEventListener('click', () => {
            const spellId = parseInt(btn.getAttribute('data-id'));
            const spell = allSpells.find(s => s.id === spellId);
            if (spell) handleDeleteSpell(spell);
        });
    });
}

// Handle spell deletion
async function handleDeleteSpell(spell) {
    const confirmed = confirm(`Czy na pewno chcesz usunąć "${spell.NazwaPL}"?`);
    if (!confirmed) return;

    try {
        const { error } = await deleteSpell(spell.id);
        if (error) {
            alert(`Błąd usuwania: ${error.message}`);
            return;
        }

        // Remove from local data
        allSpells = allSpells.filter(s => s.id !== spell.id);
        populateFilters();
        applyFilters();
        renderManageSpellsList();

        // If current card was this spell, clear it
        if (allCardsForView.length > 0 && allCardsForView[currentCardIndex]?.id === spell.id) {
            allCardsForView = [];
            renderCard();
        }
    } catch (err) {
        alert(`Nieoczekiwany błąd: ${err.message}`);
    }
}

// Update management panel UI (show/hide, role badge, description)
function updateManagePanel() {
    if (!manageTabBtn) return;

    if (currentUser) {
        manageTabBtn.style.display = 'inline-block';

        if (isAdmin) {
            manageRoleBadge.textContent = 'Administrator';
            manageRoleBadge.className = 'role-badge admin';
            manageDescription.textContent = 'Jako administrator możesz edytować i usuwać wszystkie kanty w bazie danych.';
            manageOwnerFilterGroup.style.display = 'flex';
        } else {
            manageRoleBadge.textContent = 'Użytkownik';
            manageRoleBadge.className = 'role-badge user';
            manageDescription.textContent = 'Możesz edytować i usuwać tylko kanty, które sam dodałeś.';
            manageOwnerFilterGroup.style.display = 'none';
        }

        renderManageSpellsList();
    } else {
        manageTabBtn.style.display = 'none';
    }
}

// Load spell data from Supabase
async function loadData() {
    try {
        console.log('Pobieranie zaklęć z bazy danych...');
        
        const { data, error } = await getAllSpells();
        
        if (error) {
            throw new Error(`Błąd Supabase: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            throw new Error('Baza danych jest pusta');
        }
        
        console.log(`Pobrano ${data.length} zaklęć z bazy danych`);
        
        allSpells = data.map(mapDbSpellToLegacy);
        
        const kantyCount = allSpells.filter(s => s.type === 'kant').length;
        const sztuCount = allSpells.filter(s => s.type === 'sztuka').length;
        console.log(`Kantów: ${kantyCount}, Sztuczek: ${sztuCount}, Łącznie: ${allSpells.length}`);

        // Populate filter dropdowns
        populateFilters();

        // Initial render
        applyFilters();
        updateSortIndicators();
        
        // Set default card for card view - "Amulet"
        const defaultCard = allSpells.find(spell => 
            spell.nazwaLower === 'amulet' || 
            spell.nazwaEnLower === 'amulet'
        );
        if (defaultCard) {
            allCardsForView = [defaultCard];
            currentCardIndex = 0;
            renderCard();
        }
    } catch (error) {
        console.error('Błąd wczytywania danych:', error);
        spellsBody.innerHTML = '<tr class="loading-row"><td colspan="10">Błąd wczytywania danych: ' + error.message + '</td></tr>';
    }
}

// Populate filter dropdowns
function populateFilters() {
    // Get unique sources
    const sources = new Set(allSpells
        .map(s => s.Źródło)
        .filter(s => s && s.trim() !== '')
    );
    sourceFilter.innerHTML = '<option value="">Wszystkie źródła</option>';
    Array.from(sources).sort().forEach(source => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = source;
        sourceFilter.appendChild(option);
    });

    // Get unique features
    const features = new Set(allSpells
        .map(s => s.Cecha)
        .filter(s => s && s.trim() !== '')
    );
    featureFilter.innerHTML = '<option value="">Wszystkie cechy</option>';
    Array.from(features).sort().forEach(feature => {
        const option = document.createElement('option');
        option.value = feature;
        option.textContent = feature;
        featureFilter.appendChild(option);
    });
}

// Apply all filters
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = typeFilter.value;
    const selectedSource = sourceFilter.value;
    const selectedFeature = featureFilter.value;

    filteredSpells = allSpells.filter(spell => {
        // Search filter
        const matchesSearch = searchTerm === '' ||
            spell.nazwaLower.includes(searchTerm) ||
            spell.nazwaEnLower.includes(searchTerm);

        // Type filter
        const matchesType = selectedType === '' || spell.type === selectedType;

        // Source filter
        const matchesSource = selectedSource === '' || spell.Źródło === selectedSource;

        // Feature filter
        const matchesFeature = selectedFeature === '' || spell.Cecha === selectedFeature;

        return matchesSearch && matchesType && matchesSource && matchesFeature;
    });

    // Apply sorting
    sortSpells();

    renderSpells();
    updateResultsCount();
}

// Handle sort
function handleSort(column) {
    if (currentSortColumn === column) {
        // Toggle direction if same column
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    sortSpells();
    renderSpells();
    updateSortIndicators();
}

// Sort spells
function sortSpells() {
    filteredSpells.sort((a, b) => {
        let aVal = a[currentSortColumn] || '';
        let bVal = b[currentSortColumn] || '';
        
        // Convert to lowercase for case-insensitive comparison
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return currentSortDirection === 'asc' ? comparison : -comparison;
    });
}

// Update sort indicators
function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.getAttribute('data-sort') === currentSortColumn) {
            header.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Render spells table
function renderSpells() {
    if (allSpells.length === 0) {
        spellsBody.innerHTML = '<tr class="loading-row"><td colspan="10">Ładowanie danych...</td></tr>';
        return;
    }
    
    if (filteredSpells.length === 0) {
        spellsBody.innerHTML = '<tr class="no-results"><td colspan="10">Brak wyników. Spróbuj zmienić filtry.</td></tr>';
        return;
    }

    spellsBody.innerHTML = '';

    filteredSpells.forEach((spell, index) => {
        // Main row
        const mainRow = document.createElement('tr');
        mainRow.className = `spell-row`;
        mainRow.innerHTML = `
            <td class="expand-col">
                <button class="expand-btn" data-index="${index}">▼</button>
            </td>
            <td>${spell.NazwaPL || '-'}</td>
            <td>${spell.Nazwa || '-'}</td>
            <td><span class="type-badge ${spell.type}">${spell.type === 'kant' ? 'KANT' : 'SZTUCZKA'}</span></td>
            <td>${spell.Źródło || '-'}</td>
            <td>${spell.Cecha || '-'}</td>
            <td>${spell['Min. Ręka'] || '-'}</td>
            <td>${spell.Rzucanie || '-'}</td>
            <td>${spell.Czas || '-'}</td>
            <td>${spell.Zasięg || '-'}</td>
        `;
        spellsBody.appendChild(mainRow);

        // Details row
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row';
        detailsRow.innerHTML = `
            <td colspan="10">
                <div class="details-cell">
                    ${renderSpellDetails(spell)}
                </div>
            </td>
        `;
        spellsBody.appendChild(detailsRow);

        // Add expand button listener
        const expandBtn = mainRow.querySelector('.expand-btn');
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            expandBtn.classList.toggle('expanded');
            detailsRow.classList.toggle('visible');
        });
    });
}

// Render spell details
function renderSpellDetails(spell) {
    let html = `<div class="spell-detail-header">`;

    // Basic info - Opis na pełną szerokość i wyraźnie większy
    if (spell.Opis) {
        html += `<div class="detail-item" style="grid-column: 1 / -1; font-size: 1.05em;">
            <div class="detail-label">Opis</div>
            <div class="detail-value">${spell.Opis}</div>
        </div>`;
    }

    html += `</div>`;

    // Effects table for kanty
    if (spell.type === 'kant') {
        html += `<div class="effects-section">
            <div class="effects-title">Efekty Rąk Pokerowych</div>
            <table class="effects-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Ręka</th>
                        <th>Efekt</th>
                    </tr>
                </thead>
                <tbody>`;

        HAND_NAMES.forEach(hand => {
            const effect = spell[hand] || '';
            if (effect.trim() !== '') {
                html += `<tr>
                    <td><span class="hand-label">${hand}</span></td>
                    <td>${effect}</td>
                </tr>`;
            }
        });

        html += `</tbody>
            </table>
        </div>`;
    }

    return html;
}

// Update results count
function updateResultsCount() {
    resultsCount.textContent = `Wyników: ${filteredSpells.length} / ${allSpells.length}`;
}

// Reset filters
function resetFilters() {
    searchInput.value = '';
    typeFilter.value = '';
    sourceFilter.value = '';
    featureFilter.value = '';
    applyFilters();
}

// ===== CARD VIEW FUNCTIONS =====

// Apply filters for card view
// ===== OMNIBOX FUNCTIONS =====

function handleOmniboxInput(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        omniboxSuggestions.classList.remove('visible');
        return;
    }

    const suggestions = allSpells.filter(spell => 
        spell.nazwaLower.includes(searchTerm) || 
        spell.nazwaEnLower.includes(searchTerm)
    ).slice(0, 10);

    if (suggestions.length === 0) {
        omniboxSuggestions.innerHTML = '<div class="omnibox-item" style="cursor: default; color: var(--text-secondary);">Brak wyników</div>';
        omniboxSuggestions.classList.add('visible');
        return;
    }

    omniboxSuggestions.innerHTML = suggestions.map((spell, index) => `
        <div class="omnibox-item" data-index="${index}">
            <span class="omnibox-item-type">${spell.type === 'kant' ? 'KANT' : 'SZTUCZKA'}</span>
            <div class="omnibox-item-content">
                <div class="omnibox-item-name">${spell.NazwaPL || spell.Nazwa}</div>
                <div class="omnibox-item-subtitle">${spell.Nazwa || spell.NazwaPL}</div>
            </div>
            <div class="omnibox-item-source">${spell.Źródło || '-'}</div>
        </div>
    `).join('');

    omniboxSuggestions.classList.add('visible');

    // Add click handlers
    document.querySelectorAll('.omnibox-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            selectFromOmnibox(suggestions[index]);
        });
    });
}

function handleOmniboxKeydown(e) {
    const items = document.querySelectorAll('.omnibox-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
    }
}

function selectFromOmnibox(spell) {
    allCardsForView = [spell];
    currentCardIndex = 0;
    cardSearchInput.value = spell.NazwaPL || spell.Nazwa;
    omniboxSuggestions.classList.remove('visible');
    renderCard();
}

// Render single game card
function renderCard() {
    if (allCardsForView.length === 0) {
        gameCard.innerHTML = '<div class="no-cards">Wybierz kant aby zobaczyć szczegóły</div>';
        return;
    }

    const spell = allCardsForView[currentCardIndex];
    const typeLabel = spell.type === 'kant' ? 'KANT' : 'SZTUCZKA';
    const typeBgClass = spell.type === 'kant' ? 'kant' : 'sztuka';
    const knownEntry = getKnownSpellEntry(spell);
    const isKnown = Boolean(knownEntry);

    let html = `
        <div class="card-header">
            <div class="card-corner-left">
                <div class="card-corner-label">Źródło</div>
                <div class="card-corner-value">${spell.Źródło || '-'}</div>
            </div>
            <div class="card-corner-right">
                <div class="card-corner-label">Cecha</div>
                <div class="card-corner-value">${spell.Cecha || '-'}</div>
            </div>
        </div>

        <div class="card-title">
            <div class="card-name-pl">${spell.NazwaPL || spell.Nazwa || '-'}</div>
            <div class="card-name-en">${spell.Nazwa || ''}</div>
        </div>

        <div class="card-stats">
            <div class="card-stat">
                <div class="card-stat-label">Rzucanie</div>
                <div class="card-stat-value">${spell.Rzucanie || '-'}</div>
            </div>
            <div class="card-stat">
                <div class="card-stat-label">Czas</div>
                <div class="card-stat-value">${spell.Czas || '-'}</div>
            </div>
            <div class="card-stat">
                <div class="card-stat-label">Zasięg</div>
                <div class="card-stat-value">${spell.Zasięg || '-'}</div>
            </div>
            <div class="card-stat">
                <div class="card-stat-label">Min. Ręka</div>
                <div class="card-stat-value">${spell['Min. Ręka'] || '-'}</div>
            </div>
        </div>

        <div class="card-description">${spell.Opis || 'Brak opisu'}</div>

        <div class="card-footer">
            <div class="card-footer-actions">
                ${spell.type === 'kant' ? '<button class="btn-show-effects" id="showEffectsBtn">Zobacz Efekty</button>' : ''}
                ${currentUser ? `<button class="btn-known-toggle ${isKnown ? 'known-active' : ''}" id="toggleKnownSpellBtn">${isKnown ? 'Usuń ze znanych' : 'Dodaj do znanych'}</button>` : ''}
                ${currentUser ? '<button class="btn-add-to-spellbook" id="addToSpellbookBtn">📖 Dodaj do księgi</button>' : ''}
                ${canEditSpell(spell) ? `<button class="btn-edit-spell" id="editCardSpellBtn">✏️ Edytuj</button>` : ''}
            </div>
            <span class="card-type-badge type-badge ${typeBgClass}">${typeLabel}</span>
        </div>
    `;

    gameCard.innerHTML = html;
    
    // Add event listener for effects button
    if (spell.type === 'kant') {
        const effectsBtn = document.getElementById('showEffectsBtn');
        if (effectsBtn) {
            effectsBtn.addEventListener('click', () => showCardEffects(spell));
        }
    }

    if (currentUser) {
        const toggleKnownSpellBtn = document.getElementById('toggleKnownSpellBtn');
        if (toggleKnownSpellBtn) {
            toggleKnownSpellBtn.addEventListener('click', () => toggleKnownSpell(spell));
        }
        
        const addToSpellbookBtn = document.getElementById('addToSpellbookBtn');
        if (addToSpellbookBtn) {
            addToSpellbookBtn.addEventListener('click', () => handleAddToSpellbook(spell));
        }

    // Edit button on card
    const editCardSpellBtn = document.getElementById('editCardSpellBtn');
    if (editCardSpellBtn) {
        editCardSpellBtn.addEventListener('click', () => openAddSpellModal(spell));
    }
    }
}

// Show card effects in modal
function showCardEffects(spell) {
    let html = `
        <div class="effects-title">Efekty Rąk Pokerowych - ${spell.NazwaPL || spell.Nazwa}</div>
        <table class="effects-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Ręka</th>
                    <th>Efekt</th>
                </tr>
            </thead>
            <tbody>`;
    
    HAND_NAMES.forEach(hand => {
        const effect = spell[hand] || '';
        if (effect.trim() !== '') {
            html += `<tr>
                <td><span class="hand-label">${hand}</span></td>
                <td>${effect}</td>
            </tr>`;
        }
    });
    
    html += `</tbody>
        </table>`;
    
    document.getElementById('detailsBody').innerHTML = html;
    detailsPanel.style.display = 'flex';
}

// Switch tabs
function switchTab(tabName) {
    // Update buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });

    // Update sections
    viewSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === tabName) {
            section.classList.add('active');
        }
    });


    // Refresh management panel on tab switch
    if (tabName === 'manage-view') {
        renderManageSpellsList();
    }
    // Initialize card view focus when switching to card view
    if (tabName === 'card-view') {
        setTimeout(() => {
            cardSearchInput.focus();
        }, 100);
    }
}
// checkUserOnLoad is no longer needed - setupAuthStateListener handles everything
// onAuthStateChange fires INITIAL_SESSION on page load which triggers loadUserData

function setupAuthStateListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthStateChange] Event:', event, 'Session:', session?.user?.email || 'BRAK');
        
        if (isForcedLogoutActive()) {
            console.log('[AuthStateChange] Forced logout active, cleaning up');
            clearForcedLogoutFlag();
            await forceLocalLogoutCleanup();
            return;
        }

        if (event === 'SIGNED_OUT') {
            console.log('[AuthStateChange] SIGNED_OUT detected');
            currentUser = null;
            knownSpells = [];
            userSpellbooks = [];
            userDataLoaded = false;
            isAdmin = false;
            updateAuthUI(null);
            updateKnownSpellsUI();
            updateSpellbooksUI();
            renderCard();
            return;
        }

        if (session?.user) {
            currentUser = session.user;
            updateAuthUI(currentUser);
            
            // ONLY load data on INITIAL_SESSION (token is fully ready)
            // SIGNED_IN fires during token refresh with stale token — queries hang!
            // Manual login loads data directly in handleLogin()
            if (event === 'INITIAL_SESSION' && !userDataLoaded) {
                userDataLoaded = true;
                console.log('[AuthStateChange] Loading user data on INITIAL_SESSION');
                await loadUserData(session.user);
            } else {
                console.log('[AuthStateChange] Skipping data load for event:', event);
            }
        } else {
            console.log('[AuthStateChange] No session');
            currentUser = null;
            knownSpells = [];
            userSpellbooks = [];
            userDataLoaded = false;
            isAdmin = false;
            updateAuthUI(null);
            updateKnownSpellsUI();
            updateSpellbooksUI();
            renderCard();
        }
    });
}

// Centralized user data loading - runs everything in parallel
async function loadUserData(user) {
    console.log('[loadUserData] START for:', user.email);
    const start = performance.now();
    
    // Only ensureProfile on first-ever login (not cached yet)
    const profileCacheKey = PROFILE_ENSURED_KEY + '-' + user.id;
    const profileAlreadyEnsured = localStorage.getItem(profileCacheKey);
    
    if (!profileAlreadyEnsured) {
        try {
            await ensureProfile(user);
            localStorage.setItem(profileCacheKey, 'true');
            console.log('[loadUserData] Profile ensured (first time)');
        } catch (err) {
            console.warn('[loadUserData] Profile check failed (non-critical):', err);
        }
    } else {
        console.log('[loadUserData] Profile already ensured (cached), skipping');
    }
    
    // Check admin status
    try {
        const { data: profile } = await getProfile(user.id);
        isAdmin = profile?.is_admin === true;
        console.log('[loadUserData] Admin status:', isAdmin);
    } catch (err) {
        console.warn('[loadUserData] Profile fetch failed (non-critical):', err);
        isAdmin = false;
    }
    
    // Update UI with admin status
    updateAuthUI(currentUser);
    
    // Load known spells and spellbooks IN PARALLEL
    await Promise.all([
        loadKnownSpells(),
        loadSpellbooks()
    ]);
    
    const elapsed = (performance.now() - start).toFixed(0);
    console.log(`[loadUserData] DONE in ${elapsed}ms`);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    const successDiv = document.getElementById('loginSuccess');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    if (!email || !password) {
        errorDiv.textContent = 'Podaj email i hasło';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const { data, error } = await signIn(email, password);
        
        if (error) {
            errorDiv.textContent = error.message || 'Błąd logowania';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (data.user) {
            clearForcedLogoutFlag();
            currentUser = data.user;
            userDataLoaded = true;
            successDiv.textContent = 'Zalogowano pomyślnie!';
            successDiv.style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('loginModal').style.display = 'none';
                document.getElementById('loginForm').reset();
                updateAuthUI(currentUser);
            }, 1500);
            
            // Load data directly here — signIn() returns a fresh token
            await loadUserData(data.user);
        }
    } catch (error) {
        errorDiv.textContent = 'Błąd serwera: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

async function handleLogout() {
    setForcedLogoutFlag();

    try {
        const { error } = await signOut();
        
        if (error) {
            console.warn('Wylogowanie z błędem zdalnym, czyszczę sesję lokalną:', error);
        }
    } catch (error) {
        console.warn('Wylogowanie przerwane, czyszczę sesję lokalną:', error);
    }

    clearLocalSupabaseSession();
    currentUser = null;
    knownSpells = [];
    userSpellbooks = [];
    userDataLoaded = false;
    isAdmin = false;
    updateAuthUI(null);
    updateKnownSpellsUI();
    updateSpellbooksUI();
    renderCard();
}

function setForcedLogoutFlag() {
    try {
        window.localStorage.setItem(FORCE_LOGOUT_KEY, '1');
    } catch (error) {
        console.warn('Nie udało się ustawić flagi logout:', error);
    }
}

function clearForcedLogoutFlag() {
    try {
        window.localStorage.removeItem(FORCE_LOGOUT_KEY);
    } catch (error) {
        console.warn('Nie udało się usunąć flagi logout:', error);
    }
}

function isForcedLogoutActive() {
    try {
        return window.localStorage.getItem(FORCE_LOGOUT_KEY) === '1';
    } catch {
        return false;
    }
}

async function forceLocalLogoutCleanup() {
    clearLocalSupabaseSession();
    currentUser = null;
    knownSpells = [];
    isAdmin = false;
    updateAuthUI(null);
    updateKnownSpellsUI();
    renderCard();
}

function clearLocalSupabaseSession() {
    try {
        const storages = [window.localStorage, window.sessionStorage];

        storages.forEach(storage => {
            const keysToRemove = [];
            for (let index = 0; index < storage.length; index += 1) {
                const key = storage.key(index);
                if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => storage.removeItem(key));
        });
    } catch (error) {
        console.warn('Nie udało się wyczyścić sesji Supabase:', error);
    }
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    if (user) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.email;
        addSpellBtn.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        addSpellBtn.style.display = 'none';
        isAdmin = false;
        updateSpellbooksUI(); // Hide spellbooks panel when logged out
    }
    updateManagePanel();
}

async function loadKnownSpells() {
    console.log('[loadKnownSpells] START, currentUser:', currentUser?.email || 'BRAK');
    
    if (!currentUser) {
        console.log('[loadKnownSpells] No user, resetting');
        knownSpells = [];
        updateKnownSpellsUI();
        return;
    }

    console.log('[loadKnownSpells] Fetching from Supabase for user:', currentUser.id);
    
    try {
        const { data, error } = await getKnownSpells(currentUser.id);
        
        console.log('[loadKnownSpells] Response received - data:', data?.length, 'error:', error?.message);
        
        if (error) {
            console.error('[loadKnownSpells] Error:', error);
            setKnownSpellsFeedback(`Błąd pobierania: ${error.message || 'nieznany błąd'}`, true);
            knownSpells = [];
            updateKnownSpellsUI();
            return;
        }

        knownSpells = data || [];
        console.log('[loadKnownSpells] Loaded', knownSpells.length, 'known spells');
        updateKnownSpellsUI();
        renderCard();
    } catch (error) {
        console.error('[loadKnownSpells] Catch block error:', error);
        knownSpells = [];
        updateKnownSpellsUI();
        setKnownSpellsFeedback('Nie udało się pobrać listy', true);
    }
    
    console.log('[loadKnownSpells] END');
}

function getKnownSpellEntry(spell) {
    const spellPl = (spell.NazwaPL || '').trim().toLowerCase();
    const spellEn = (spell.Nazwa || '').trim().toLowerCase();

    return knownSpells.find(item => {
        const itemPl = (item.spell_name_pl || '').trim().toLowerCase();
        const itemEn = (item.spell_name_en || '').trim().toLowerCase();
        return (spellPl && itemPl === spellPl) || (spellEn && itemEn === spellEn);
    });
}

async function toggleKnownSpell(spell) {
    if (!currentUser || knownSpellActionInProgress) {
        return;
    }

    knownSpellActionInProgress = true;
    setKnownSpellsFeedback('Zapisywanie zmian...', false);

    const toggleKnownSpellBtn = document.getElementById('toggleKnownSpellBtn');
    if (toggleKnownSpellBtn) {
        toggleKnownSpellBtn.disabled = true;
    }

    const existingEntry = getKnownSpellEntry(spell);

    if (existingEntry) {
        const { error } = await removeKnownSpell(existingEntry.id);
        if (error) {
            console.error('Błąd usuwania znanego zaklęcia:', error);
            setKnownSpellsFeedback(`Nie udało się usunąć: ${error.message || 'nieznany błąd'}`, true);
            knownSpellActionInProgress = false;
            if (toggleKnownSpellBtn) toggleKnownSpellBtn.disabled = false;
            return;
        }
        setKnownSpellsFeedback('Usunięto ze znanych.', false);
    } else {
        const { error } = await addKnownSpell(currentUser.id, spell.NazwaPL || '', spell.Nazwa || '');
        if (error) {
            console.error('Błąd dodawania znanego zaklęcia:', error);
            setKnownSpellsFeedback(`Nie udało się dodać: ${error.message || 'nieznany błąd'}`, true);
            knownSpellActionInProgress = false;
            if (toggleKnownSpellBtn) toggleKnownSpellBtn.disabled = false;
            return;
        }
        setKnownSpellsFeedback('Dodano do znanych.', false);
    }

    await loadKnownSpells();
    knownSpellActionInProgress = false;
    if (toggleKnownSpellBtn) toggleKnownSpellBtn.disabled = false;
}

function setKnownSpellsFeedback(message, isError = false) {
    if (!knownSpellsHint || !currentUser) {
        return;
    }

    knownSpellsHint.style.display = 'block';
    knownSpellsHint.textContent = message;
    knownSpellsHint.style.color = isError ? '#ff6b6b' : 'var(--text-secondary)';
}

function updateKnownSpellsUI() {
    console.log('[updateKnownSpellsUI] START');
    console.log('[updateKnownSpellsUI] Panel element:', knownSpellsPanel ? 'FOUND' : 'NOT FOUND');
    console.log('[updateKnownSpellsUI] currentUser:', currentUser?.email || 'BRAK');
    console.log('[updateKnownSpellsUI] knownSpells count:', knownSpells.length);
    
    if (!knownSpellsPanel || !knownSpellsList || !knownSpellsCount || !knownSpellsHint) {
        console.warn('[updateKnownSpellsUI] Missing DOM elements!');
        return;
    }

    if (!currentUser) {
        console.log('[updateKnownSpellsUI] No user, hiding panel');
        knownSpellsPanel.style.display = 'none';
        knownSpellsList.innerHTML = '';
        knownSpellsCount.textContent = '0';
        return;
    }

    console.log('[updateKnownSpellsUI] User logged in, showing panel');
    knownSpellsPanel.style.display = 'block';
    knownSpellsCount.textContent = String(knownSpells.length);

    if (knownSpells.length === 0) {
        console.log('[updateKnownSpellsUI] No known spells, showing hint');
        knownSpellsHint.style.display = 'block';
        knownSpellsHint.textContent = 'Nie masz jeszcze znanych zaklęć.';
        knownSpellsHint.style.color = 'var(--text-secondary)';
        knownSpellsList.innerHTML = '';
        return;
    }

    knownSpellsHint.style.display = 'none';
    knownSpellsHint.style.color = 'var(--text-secondary)';

    const sortedKnown = [...knownSpells].sort((a, b) => {
        const aName = (a.spell_name_pl || a.spell_name_en || '').toLowerCase();
        const bName = (b.spell_name_pl || b.spell_name_en || '').toLowerCase();
        return aName.localeCompare(bName);
    });

    console.log('[updateKnownSpellsUI] Rendering', sortedKnown.length, 'items');
    knownSpellsList.innerHTML = sortedKnown.map(item => {
        const label = item.spell_name_pl || item.spell_name_en || '-';
        return `
            <li class="known-spell-item">
                <span>${label}</span>
                <button class="known-remove-btn" data-id="${item.id}">Usuń</button>
            </li>
        `;
    }).join('');

    knownSpellsList.querySelectorAll('.known-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const { error } = await removeKnownSpell(id);
            if (error) {
                console.error('Błąd usuwania znanego zaklęcia:', error);
                return;
            }
            await loadKnownSpells();
        });
    });
    
    console.log('[updateKnownSpellsUI] DONE');
}

// ============= SPELLBOOKS FUNCTIONS =============

async function loadSpellbooks() {
    console.log('[loadSpellbooks] START, currentUser:', currentUser?.email || 'BRAK');
    
    if (!currentUser) {
        console.log('[loadSpellbooks] No user, resetting');
        userSpellbooks = [];
        updateSpellbooksUI();
        return;
    }

    console.log('[loadSpellbooks] Fetching from Supabase for user:', currentUser.id);
    
    try {
        const { data, error } = await getSpellbooks(currentUser.id);
        
        console.log('[loadSpellbooks] Response received - data count:', data?.length, 'error:', error?.message);
        
        if (error) {
            console.error('[loadSpellbooks] Error:', error);
            userSpellbooks = [];
            updateSpellbooksUI();
            return;
        }

        userSpellbooks = data || [];
        console.log('[loadSpellbooks] Loaded', userSpellbooks.length, 'spellbooks');
        updateSpellbooksUI();
    } catch (error) {
        console.error('[loadSpellbooks] Catch block error:', error);
        userSpellbooks = [];
        updateSpellbooksUI();
    }
    
    console.log('[loadSpellbooks] END');
}

function updateSpellbooksUI() {
    console.log('[updateSpellbooksUI] START');
    console.log('[updateSpellbooksUI] Panel element:', spellbooksPanel ? 'FOUND' : 'NOT FOUND');
    console.log('[updateSpellbooksUI] currentUser:', currentUser?.email || 'BRAK');
    console.log('[updateSpellbooksUI] userSpellbooks count:', userSpellbooks.length);
    
    if (!spellbooksPanel || !spellbooksList || !spellbooksHint) {
        console.warn('[updateSpellbooksUI] Missing DOM elements!');
        return;
    }

    if (!currentUser) {
        console.log('[updateSpellbooksUI] No user, hiding panel');
        spellbooksPanel.style.display = 'none';
        spellbooksList.innerHTML = '';
        return;
    }

    console.log('[updateSpellbooksUI] User logged in, showing panel');
    spellbooksPanel.style.display = 'block';

    if (userSpellbooks.length === 0) {
        console.log('[updateSpellbooksUI] No spellbooks, showing hint');
        spellbooksHint.style.display = 'block';
        spellbooksHint.textContent = 'Nie masz jeszcze żadnych ksiąg. Utwórz swoją pierwszą Księgę Hoyla!';
        spellbooksList.innerHTML = '';
        return;
    }

    console.log('[updateSpellbooksUI] Has spellbooks, hiding hint');
    spellbooksHint.style.display = 'none';

    const sortedSpellbooks = [...userSpellbooks].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
    });

    spellbooksList.innerHTML = sortedSpellbooks.map(book => {
        return `
            <div class="spellbook-item" data-id="${book.id}">
                <div class="spellbook-item-header">
                    <span class="spellbook-item-name">${book.name}</span>
                    <span class="spellbook-item-reliability">Niezawodność: ${book.reliability || 1}</span>
                </div>
                <div class="spellbook-item-count">Zaklęć: <strong id="spellbook-${book.id}-count">...</strong></div>
            </div>
        `;
    }).join('');

    // Add click handlers to view spellbook details
    spellbooksList.querySelectorAll('.spellbook-item').forEach(item => {
        item.addEventListener('click', () => {
            const bookId = item.getAttribute('data-id');
            viewSpellbookDetails(bookId);
        });
    });

    // Load spell counts for each spellbook
    sortedSpellbooks.forEach(book => {
        loadSpellbookSpellCount(book.id);
    });
    
    console.log('[updateSpellbooksUI] DONE');
}

async function loadSpellbookSpellCount(spellbookId) {
    try {
        const { data, error } = await getSpellbookSpells(spellbookId);
        if (!error && data) {
            const countElement = document.getElementById(`spellbook-${spellbookId}-count`);
            if (countElement) {
                countElement.textContent = data.length;
            }
        }
    } catch (error) {
        console.error('[loadSpellbookSpellCount] Error:', error);
    }
}

async function handleCreateSpellbook(e) {
    e.preventDefault();
    
    if (!currentUser) {
        return;
    }

    const name = spellbookNameInput.value.trim();
    const reliability = parseInt(spellbookReliabilityInput.value);

    if (!name) {
        showSpellbookMessage('Nazwa księgi jest wymagana.', true);
        return;
    }

    try {
        const { data, error } = await createSpellbook(currentUser.id, name, reliability);
        if (error) {
            console.error('[handleCreateSpellbook] Error:', error);
            showSpellbookMessage(`Błąd: ${error.message}`, true);
            return;
        }

        showSpellbookMessage('Księga utworzona!', false);
        spellbookNameInput.value = '';
        spellbookReliabilityInput.value = '1';
        reliabilityValueDisplay.textContent = '1';
        
        setTimeout(() => {
            createSpellbookModal.style.display = 'none';
        }, 1000);

        await loadSpellbooks();
    } catch (error) {
        console.error('[handleCreateSpellbook] Catch error:', error);
        showSpellbookMessage('Nie udało się utworzyć księgi.', true);
    }
}

function showSpellbookMessage(message, isError = false) {
    const errorEl = document.getElementById('spellbookError');
    const successEl = document.getElementById('spellbookSuccess');

    if (isError) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
    } else {
        successEl.textContent = message;
        successEl.style.display = 'block';
        errorEl.style.display = 'none';
    }

    setTimeout(() => {
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
    }, 3000);
}

async function viewSpellbookDetails(spellbookId) {
    const spellbook = userSpellbooks.find(b => b.id == spellbookId);
    if (!spellbook) return;

    // Set header info
    document.getElementById('spellbookDetailsTitle').textContent = spellbook.name;
    document.getElementById('spellbookDetailsReliability').textContent = spellbook.reliability || 1;

    // Load spells in this spellbook
    try {
        const { data, error } = await getSpellbookSpells(spellbookId);
        if (error) {
            console.error('[viewSpellbookDetails] Error loading spells:', error);
            return;
        }

        const spells = data || [];
        document.getElementById('spellbookDetailsCount').textContent = spells.length;

        const spellsContainer = document.getElementById('spellbookDetailsSpells');
        if (spells.length === 0) {
            spellsContainer.innerHTML = '<p style="color: var(--text-secondary);">Brak zaklęć w tej księdze.</p>';
        } else {
            spellsContainer.innerHTML = spells.map(spell => {
                const label = spell.spell_name_pl || spell.spell_name_en || '-';
                return `
                    <div class="spellbook-spell-item">
                        <span class="spellbook-spell-name">${label}</span>
                        <button class="spellbook-spell-remove" data-spell-id="${spell.id}">Usuń</button>
                    </div>
                `;
            }).join('');

            // Add remove handlers
            spellsContainer.querySelectorAll('.spellbook-spell-remove').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const spellId = btn.getAttribute('data-spell-id');
                    await removeSpellFromSpellbook(spellbookId, spellId);
                });
            });
        }

        // Set up delete spellbook button
        const deleteBtn = document.getElementById('deleteSpellbookBtn');
        deleteBtn.onclick = async () => {
            if (confirm(`Czy na pewno chcesz usunąć księgę "${spellbook.name}"?`)) {
                await handleDeleteSpellbook(spellbookId);
            }
        };

        spellbookDetailsModal.style.display = 'block';
    } catch (error) {
        console.error('[viewSpellbookDetails] Catch error:', error);
    }
}

async function removeSpellFromSpellbook(spellbookId, spellId) {
    try {
        const { error } = await supabase
            .from('spellbook_spells')
            .delete()
            .eq('id', spellId);

        if (error) {
            console.error('[removeSpellFromSpellbook] Error:', error);
            return;
        }

        // Refresh the details view
        await viewSpellbookDetails(spellbookId);
        await loadSpellbooks(); // Refresh counts
    } catch (error) {
        console.error('[removeSpellFromSpellbook] Catch error:', error);
    }
}

async function handleDeleteSpellbook(spellbookId) {
    try {
        // First delete all spells in this spellbook
        const { error: spellsError } = await supabase
            .from('spellbook_spells')
            .delete()
            .eq('spellbook_id', spellbookId);

        if (spellsError) {
            console.error('[handleDeleteSpellbook] Error deleting spells:', spellsError);
            alert('Nie udało się usunąć zaklęć z księgi.');
            return;
        }

        // Then delete the spellbook itself
        const { error: bookError } = await supabase
            .from('spellbooks')
            .delete()
            .eq('id', spellbookId);

        if (bookError) {
            console.error('[handleDeleteSpellbook] Error deleting spellbook:', bookError);
            alert('Nie udało się usunąć księgi.');
            return;
        }

        spellbookDetailsModal.style.display = 'none';
        await loadSpellbooks();
    } catch (error) {
        console.error('[handleDeleteSpellbook] Catch error:', error);
        alert('Wystąpił błąd podczas usuwania księgi.');
    }
}

function handleAddToSpellbook(spell) {
    if (!currentUser) {
        return;
    }

    if (userSpellbooks.length === 0) {
        alert('Najpierw utwórz księgę!');
        return;
    }

    currentSpellForSpellbook = spell;
    
    const spellNameDisplay = document.getElementById('addToSpellbookSpellName');
    spellNameDisplay.textContent = `"${spell.NazwaPL || spell.Nazwa || '-'}"`;

    const selectionList = document.getElementById('spellbookSelectionList');
    selectionList.innerHTML = userSpellbooks.map(book => {
        return `
            <div class="spellbook-selection-item" data-id="${book.id}">
                <span class="spellbook-selection-name">${book.name}</span>
                <div>
                    <span class="spellbook-selection-reliability">Niez.: ${book.reliability}</span>
                    <button class="btn-add-to-spellbook" data-book-id="${book.id}">Dodaj</button>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    selectionList.querySelectorAll('.btn-add-to-spellbook').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const bookId = btn.getAttribute('data-book-id');
            await addSpellToSelectedSpellbook(bookId);
        });
    });

    addToSpellbookModal.style.display = 'block';
}

async function addSpellToSelectedSpellbook(spellbookId) {
    if (!currentSpellForSpellbook) return;

    const messageEl = document.getElementById('addToSpellbookMessage');
    messageEl.textContent = 'Dodawanie...';
    messageEl.style.display = 'block';
    messageEl.style.color = 'var(--text-primary)';

    try {
        const { data, error } = await addSpellToSpellbook(
            spellbookId,
            currentSpellForSpellbook.NazwaPL || '',
            currentSpellForSpellbook.Nazwa || ''
        );

        if (error) {
            console.error('[addSpellToSelectedSpellbook] Error:', error);
            if (error.code === '23505') {
                messageEl.textContent = 'To zaklęcie jest już w tej księdze!';
            } else {
                messageEl.textContent = `Błąd: ${error.message}`;
            }
            messageEl.style.color = '#ff6b6b';
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
            return;
        }

        messageEl.textContent = 'Dodano do księgi!';
        messageEl.style.color = '#90ee90';
        
        await loadSpellbooks(); // Refresh counts
        
        setTimeout(() => {
            addToSpellbookModal.style.display = 'none';
            messageEl.style.display = 'none';
        }, 1500);
    } catch (error) {
        console.error('[addSpellToSelectedSpellbook] Catch error:', error);
        messageEl.textContent = 'Nie udało się dodać.';
        messageEl.style.color = '#ff6b6b';
    }
}
