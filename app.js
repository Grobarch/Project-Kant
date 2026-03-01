// Import Supabase client and auth functions
import { 
    supabase, signIn, signOut, getCurrentUser, ensureProfile, 
    getKnownSpells, addKnownSpell, removeKnownSpell, 
    addSpellToSpellbook, getSpellbookSpells, removeSpellFromSpellbook, deleteSpellbook,
    createCustomSpell, getCustomSpells, getAllSpells, insertSpell, updateSpell, deleteSpell, getProfile,
    // New character functions
    getCharacters, createCharacter, updateCharacter, deleteCharacter,
    getKnownSpellsForCharacter, addKnownSpellToCharacter,
    getSpellbooksForCharacter, createSpellbookForCharacter,
    updateKnownSpellOrder
} from './supabase.js';

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

// Character state
let userCharacters = [];
let currentCharacter = null; // Currently selected character

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
const manageSidebarBtn = document.getElementById('manageSidebarBtn');
const manageSearchInput = document.getElementById('manageSearchInput');
const manageTypeFilter = document.getElementById('manageTypeFilter');
const manageOwnerFilter = document.getElementById('manageOwnerFilter');
const manageOwnerFilterGroup = document.getElementById('manageOwnerFilterGroup');
const manageSpellsList = document.getElementById('manageSpellsList');
const manageResultsCount = document.getElementById('manageResultsCount');
const manageRoleBadge = document.getElementById('manageRoleBadge');
const manageDescription = document.getElementById('manageDescription');

// DOM Elements - Character Management
const charactersList = document.getElementById('charactersList');
const characterHint = document.getElementById('characterHint');
const createCharacterBtn = document.getElementById('createCharacterBtn');
const createCharacterModal = document.getElementById('createCharacterModal');
const closeCreateCharacterModal = document.getElementById('closeCreateCharacterModal');
const createCharacterForm = document.getElementById('createCharacterForm');
const newCharacterName = document.getElementById('newCharacterName');
const newCharacterImageUrl = document.getElementById('newCharacterImageUrl');

// DOM Elements - Character Details View
const characterDetailsView = document.getElementById('characterDetailsView');
const characterName = document.getElementById('characterName');
const characterImage = document.getElementById('characterImage');
const backToCharactersBtn = document.getElementById('backToCharactersBtn');
const editCharacterNameBtn = document.getElementById('editCharacterNameBtn');
const changeCharacterImageBtn = document.getElementById('changeCharacterImageBtn');
const characterKnownSpellsList = document.getElementById('characterKnownSpellsList');
const characterKnownSpellsCount = document.getElementById('characterKnownSpellsCount');
const characterSpellbooksList = document.getElementById('characterSpellbooksList');
const createCharacterSpellbookBtn = document.getElementById('createCharacterSpellbookBtn');

// DOM Elements - Edit Character Modals
const editCharacterNameModal = document.getElementById('editCharacterNameModal');
const closeEditCharacterNameModal = document.getElementById('closeEditCharacterNameModal');
const editCharacterNameForm = document.getElementById('editCharacterNameForm');
const editCharacterNameInput = document.getElementById('editCharacterNameInput');
const changeCharacterImageModal = document.getElementById('changeCharacterImageModal');
const closeChangeCharacterImageModal = document.getElementById('closeChangeCharacterImageModal');
const changeCharacterImageForm = document.getElementById('changeCharacterImageForm');
const editCharacterImageUrl = document.getElementById('editCharacterImageUrl');

// DOM Elements - Add Known Spell Modal
const addKnownSpellBtn = document.getElementById('addKnownSpellBtn');
const addKnownSpellModal = document.getElementById('addKnownSpellModal');
const closeAddKnownSpellModal = document.getElementById('closeAddKnownSpellModal');
const addKnownSpellSearch = document.getElementById('addKnownSpellSearch');
const addKnownSpellResults = document.getElementById('addKnownSpellResults');

// DOM Elements - Spellbook Details Tabs
const spellbookTabButtons = document.querySelectorAll('.spellbook-tab-btn');
const currentSpellsTab = document.getElementById('currentSpellsTab');
const missingSpellsTab = document.getElementById('missingSpellsTab');
const availableSpellsTab = document.getElementById('availableSpellsTab');
const spellbookAvailableSearch = document.getElementById('spellbookAvailableSearch');
const spellbookAvailableSpells = document.getElementById('spellbookAvailableSpells');
const spellbookMissingSpells = document.getElementById('spellbookMissingSpells');
const deleteSpellbookBtn = document.getElementById('deleteSpellbookBtn');

// Current spellbook being viewed
let currentSpellbook = null;

// DOM Elements - Preview/Export
const previewKnownSpellsBtn = document.getElementById('previewKnownSpellsBtn');
const previewSpellbookBtn = document.getElementById('previewSpellbookBtn');
const previewExportModal = document.getElementById('previewExportModal');
const closePreviewExportModal = document.getElementById('closePreviewExportModal');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const exportPDFBtn = document.getElementById('exportPDFBtn');

// Card view state
let currentCardIndex = 0;
let allCardsForView = [];

// DOM Elements - Modal & Navigation
const detailsPanel = document.getElementById('detailsPanel');
const closeDetailsBtn = document.getElementById('closeDetails');
const sidebarButtons = document.querySelectorAll('.sidebar-btn');
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

    // Sidebar Navigation
    sidebarButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewName = e.currentTarget.getAttribute('data-view');
            switchView(viewName);
        });
    });

    // Character Management
    if (createCharacterBtn) {
        createCharacterBtn.addEventListener('click', () => {
            createCharacterModal.style.display = 'block';
        });
    }

    if (closeCreateCharacterModal) {
        closeCreateCharacterModal.addEventListener('click', () => {
            createCharacterModal.style.display = 'none';
        });
    }

    if (createCharacterForm) {
        createCharacterForm.addEventListener('submit', handleCreateCharacter);
    }

    if (backToCharactersBtn) {
        backToCharactersBtn.addEventListener('click', () => {
            currentCharacter = null;
            updateCharacterManagementView();
        });
    }

    if (editCharacterNameBtn) {
        editCharacterNameBtn.addEventListener('click', () => {
            if (currentCharacter) {
                editCharacterNameInput.value = currentCharacter.name;
                editCharacterNameModal.style.display = 'block';
            }
        });
    }

    if (closeEditCharacterNameModal) {
        closeEditCharacterNameModal.addEventListener('click', () => {
            editCharacterNameModal.style.display = 'none';
        });
    }

    if (editCharacterNameForm) {
        editCharacterNameForm.addEventListener('submit', handleEditCharacterName);
    }

    if (changeCharacterImageBtn) {
        changeCharacterImageBtn.addEventListener('click', () => {
            if (currentCharacter) {
                editCharacterImageUrl.value = currentCharacter.image_url || '';
                changeCharacterImageModal.style.display = 'block';
            }
        });
    }

    if (closeChangeCharacterImageModal) {
        closeChangeCharacterImageModal.addEventListener('click', () => {
            changeCharacterImageModal.style.display = 'none';
        });
    }

    if (changeCharacterImageForm) {
        changeCharacterImageForm.addEventListener('submit', handleChangeCharacterImage);
    }

    if (createCharacterSpellbookBtn) {
        createCharacterSpellbookBtn.addEventListener('click', () => {
            createSpellbookModal.style.display = 'block';
        });
    }

    // Add Known Spell Modal
    if (addKnownSpellBtn) {
        addKnownSpellBtn.addEventListener('click', () => {
            addKnownSpellModal.style.display = 'block';
            addKnownSpellSearch.value = '';
            renderAddKnownSpellResults();
        });
    }

    if (closeAddKnownSpellModal) {
        closeAddKnownSpellModal.addEventListener('click', () => {
            addKnownSpellModal.style.display = 'none';
        });
    }

    if (addKnownSpellSearch) {
        addKnownSpellSearch.addEventListener('input', renderAddKnownSpellResults);
    }

    // Spellbook Details Tabs
    spellbookTabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            switchSpellbookTab(tabName);
        });
    });

    if (spellbookAvailableSearch) {
        spellbookAvailableSearch.addEventListener('input', renderAvailableSpellsForSpellbook);
    }

    if (deleteSpellbookBtn) {
        deleteSpellbookBtn.addEventListener('click', handleDeleteSpellbook);
    }

    // Add spell to spellbook button (in current spells tab)
    const addSpellToSpellbookBtn = document.getElementById('addSpellToSpellbookBtn');
    if (addSpellToSpellbookBtn) {
        addSpellToSpellbookBtn.addEventListener('click', () => {
            switchSpellbookTab('available-spells');
        });
    }

    // Add missing spell button
    const addMissingSpellBtn = document.getElementById('addMissingSpellBtn');
    if (addMissingSpellBtn) {
        addMissingSpellBtn.addEventListener('click', () => {
            switchSpellbookTab('available-spells');
        });
    }

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

    // Preview/Export event listeners
    if (previewKnownSpellsBtn) {
        previewKnownSpellsBtn.addEventListener('click', handlePreviewKnownSpells);
    }

    if (previewSpellbookBtn) {
        previewSpellbookBtn.addEventListener('click', handlePreviewSpellbook);
    }

    if (closePreviewExportModal) {
        closePreviewExportModal.addEventListener('click', () => {
            previewExportModal.style.display = 'none';
        });
    }

    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', handleExportToPDF);
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
        if (event.target === addKnownSpellModal) {
            addKnownSpellModal.style.display = 'none';
        }
        if (event.target === previewExportModal) {
            previewExportModal.style.display = 'none';
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
            const isSztuka = newSpellType.value === 'sztuczka';
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
        'Min. Ręka': dbSpell.min_hand || (dbSpell.type === 'sztuczka' ? '-' : ''),
        'Rzucanie': dbSpell.casting || (dbSpell.type === 'sztuczka' ? '-' : ''),
        'Czas': dbSpell.duration || (dbSpell.type === 'sztuczka' ? '-' : ''),
        'Zasięg': dbSpell.range || (dbSpell.type === 'sztuczka' ? '-' : ''),
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
    
    // Populate dropdown fields
    populateAddSpellForm();

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
        const isSztuka = spellToEdit.type === 'sztuczka';
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
    const isSztuka = type === 'sztuczka';

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
    if (!manageSidebarBtn) return;

    if (currentUser) {
        manageSidebarBtn.style.display = 'flex';

        if (isAdmin) {
            if (manageRoleBadge) {
                manageRoleBadge.textContent = 'Administrator';
                manageRoleBadge.className = 'role-badge admin';
            }
            if (manageDescription) {
                manageDescription.textContent = 'Jako administrator możesz edytować i usuwać wszystkie kanty w bazie danych.';
            }
            if (manageOwnerFilterGroup) {
                manageOwnerFilterGroup.style.display = 'flex';
            }
        } else {
            if (manageRoleBadge) {
                manageRoleBadge.textContent = 'Użytkownik';
                manageRoleBadge.className = 'role-badge user';
            }
            if (manageDescription) {
                manageDescription.textContent = 'Możesz edytować i usuwać tylko kanty, które sam dodałeś.';
            }
            if (manageOwnerFilterGroup) {
                manageOwnerFilterGroup.style.display = 'none';
            }
        }
    } else {
        manageSidebarBtn.style.display = 'none';
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
        const sztuCount = allSpells.filter(s => s.type === 'sztuczka').length;
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

// Populate dropdowns in Add/Edit Spell form
function populateAddSpellForm() {
    // Get unique sources and add Homebrew
    const sources = new Set(allSpells
        .map(s => s.Źródło)
        .filter(s => s && s.trim() !== '' && s.toLowerCase() !== 'pies')
    );
    sources.add('Homebrew'); // Add Homebrew option
    
    const sourceSelect = document.getElementById('newSpellSource');
    const selectedSource = sourceSelect.value; // Remember current selection
    sourceSelect.innerHTML = '<option value="">Wybierz źródło</option>';
    Array.from(sources).sort().forEach(source => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = source;
        sourceSelect.appendChild(option);
    });
    if (selectedSource) sourceSelect.value = selectedSource; // Restore selection

    // Get unique features
    const features = new Set(allSpells
        .map(s => s.Cecha)
        .filter(s => s && s.trim() !== '')
    );
    
    const attributeSelect = document.getElementById('newSpellAttribute');
    const selectedAttribute = attributeSelect.value; // Remember current selection
    attributeSelect.innerHTML = '<option value="">Wybierz cechę</option>';
    Array.from(features).sort().forEach(feature => {
        const option = document.createElement('option');
        option.value = feature;
        option.textContent = feature;
        attributeSelect.appendChild(option);
    });
    if (selectedAttribute) attributeSelect.value = selectedAttribute; // Restore selection
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

    // Add action button listeners
    spellsBody.querySelectorAll('.btn-known').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const spellId = parseInt(btn.getAttribute('data-spell-id'));
            const spell = filteredSpells.find(s => s.id === spellId);
            if (spell) {
                await toggleKnownSpell(spell);
                renderTable(); // Refresh to update button state
            }
        });
    });

    spellsBody.querySelectorAll('.btn-spellbook').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const spellId = parseInt(btn.getAttribute('data-spell-id'));
            const spell = filteredSpells.find(s => s.id === spellId);
            if (spell) {
                openAddToSpellbookModal(spell);
            }
        });
    });

    spellsBody.querySelectorAll('.btn-delete-own-spell').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const spellId = parseInt(btn.getAttribute('data-spell-id'));
            const spell = filteredSpells.find(s => s.id === spellId) || allSpells.find(s => s.id === spellId);
            if (spell) {
                await handleDeleteSpell(spell);
            }
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

    // Action buttons
    if (currentUser) {
        html += `<div class="spell-detail-actions">`;

        if (currentCharacter) {
            const isKnown = getKnownSpellEntry(spell);
            html += `<button class="btn-action btn-known" data-spell-id="${spell.id}" data-is-known="${isKnown ? 'true' : 'false'}">
                ${isKnown ? '✓ Znane' : '+ Dodaj do znanych'}
            </button>`;

            if (userSpellbooks.length > 0) {
                html += `<button class="btn-action btn-spellbook" data-spell-id="${spell.id}">
                    📕 Dodaj do księgi
                </button>`;
            }
        }

        if (canDeleteSpell(spell)) {
            html += `<button class="btn-action btn-delete-own-spell" data-spell-id="${spell.id}">
                🗑️ Usuń mój kant
            </button>`;
        }

        html += `</div>`;
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
    const typeBgClass = spell.type === 'kant' ? 'kant' : 'sztuczka';
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

        <div class="card-description">
            <div class="card-description-title">Opis</div>
            <div class="card-description-body">${spell.Opis || 'Brak opisu'}</div>
        </div>

        <div class="card-footer">
            <div class="card-footer-actions">
                ${spell.type === 'kant' ? '<button class="btn-show-effects" id="showEffectsBtn">Zobacz Efekty</button>' : ''}
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

    // Edit button on card
    const editCardSpellBtn = document.getElementById('editCardSpellBtn');
    if (editCardSpellBtn) {
        editCardSpellBtn.addEventListener('click', () => openAddSpellModal(spell));
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
function switchView(viewName) {
    // Update sidebar buttons
    sidebarButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === viewName) {
            btn.classList.add('active');
        }
    });

    // Update sections
    viewSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === viewName) {
            section.classList.add('active');
        }
    });

    // Refresh management panel on view switch
    if (viewName === 'manage-view') {
        updateCharacterManagementView();
    }
    // Initialize card view focus when switching to card view
    if (viewName === 'card-view') {
        setTimeout(() => {
            cardSearchInput.focus();
        }, 100);
    }
}

function normalizeCharacterImageUrl(rawUrl) {
    if (!rawUrl) return null;

    const trimmedUrl = String(rawUrl).trim();
    if (!trimmedUrl) return null;

    if (trimmedUrl.startsWith('//')) {
        return `https:${trimmedUrl}`;
    }

    if (trimmedUrl.startsWith('http://')) {
        return `https://${trimmedUrl.slice('http://'.length)}`;
    }

    if (trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:image/')) {
        return trimmedUrl;
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        if (parsedUrl.protocol === 'http:') {
            parsedUrl.protocol = 'https:';
        }
        return parsedUrl.href;
    } catch {
        return null;
    }
}

// ============================
// CHARACTER MANAGEMENT
// ============================

async function loadCharacters() {
    if (!currentUser) {
        userCharacters = [];
        return;
    }

    const { data, error } = await getCharacters(currentUser.id);
    if (error) {
        console.error('Error loading characters:', error);
        return;
    }

    userCharacters = data || [];
    
    // Load actual spell and spellbook counts for each character
    for (const char of userCharacters) {
        const { data: knownSpellsData } = await getKnownSpellsForCharacter(char.id);
        const { data: spellbooksData } = await getSpellbooksForCharacter(char.id);
        char.known_spells_count = knownSpellsData?.length || 0;
        char.spellbooks_count = spellbooksData?.length || 0;
    }
    
    updateCharacterManagementView();
    updateAllCharacterCardStats();  // Update all cards after loading
}

function updateCharacterCardStats() {
    if (!currentCharacter) return;
    
    // Find the card for current character (compare as strings to avoid type issues)
    const card = [...document.querySelectorAll('.character-card')].find(c => 
        String(c.getAttribute('data-character-id')) === String(currentCharacter.id)
    );
    
    if (!card) {
        console.warn(`[updateCharacterCardStats] Card not found for character ID: ${currentCharacter.id}`);
        return;
    }
    
    console.log(`[updateCharacterCardStats] Updating card for ${currentCharacter.name}: ${knownSpells.length} spells, ${userSpellbooks.length} spellbooks`);
    updateCardNumberSpans(card, knownSpells.length, userSpellbooks.length);
}

function updateAllCharacterCardStats() {
    console.log('[updateAllCharacterCardStats] Updating all character cards');
    document.querySelectorAll('.character-card').forEach(card => {
        const characterId = card.getAttribute('data-character-id');
        const character = userCharacters.find(c => String(c.id) === String(characterId));
        
        if (character) {
            // Get counts for this character from the character object
            const knownCount = character.known_spells_count || 0;
            const spellbooksCount = character.spellbooks_count || 0;
            console.log(`[updateAllCharacterCardStats] Card ${character.name}: ${knownCount} spells, ${spellbooksCount} spellbooks`);
            updateCardNumberSpans(card, knownCount, spellbooksCount);
        }
    });
}

function updateCardNumberSpans(card, knownCount, spellbooksCount) {
    const statsContainer = card.querySelector('.character-card-stats');
    if (!statsContainer) {
        console.warn('[updateCardNumberSpans] Stats container not found');
        return;
    }
    
    // Get all spans in stats container (skip emoji spans)
    const allSpans = Array.from(statsContainer.querySelectorAll('span'));
    
    // Find the number spans by looking for ones that contain only digits
    const numberSpans = allSpans.filter(span => /^\d+$/.test(span.textContent.trim()));
    
    if (numberSpans.length >= 2) {
        numberSpans[0].textContent = knownCount;
        numberSpans[1].textContent = spellbooksCount;
        console.log(`[updateCardNumberSpans] Updated: ${knownCount} spells, ${spellbooksCount} spellbooks`);
    } else {
        console.warn(`[updateCardNumberSpans] Expected 2 number spans but found ${numberSpans.length}`);
    }
}

function updateCharacterManagementView() {
    if (!currentUser) {
        characterHint.style.display = 'block';
        characterHint.textContent = 'Zaloguj się, aby zarządzać kanciarzami.';
        charactersList.innerHTML = '';
        characterDetailsView.style.display = 'none';
        document.querySelector('.character-management').style.display = 'block';
        if (manageSidebarBtn) manageSidebarBtn.style.display = 'none';
        return;
    }

    // Show management sidebar button
    if (manageSidebarBtn) manageSidebarBtn.style.display = 'flex';

    // If no character is selected, show character list
    if (!currentCharacter) {
        document.querySelector('.character-management').style.display = 'block';
        characterDetailsView.style.display = 'none';
        
        characterHint.style.display = userCharacters.length === 0 ? 'block' : 'none';
        characterHint.textContent = 'Utwórz swojego pierwszego kanciarza, aby zacząć zarządzać kantami i księgami.';

        charactersList.innerHTML = userCharacters.map(char => {
            const characterImageUrl = normalizeCharacterImageUrl(char.image_url);

            return `
            <div class="character-card" data-character-id="${char.id}">
                ${characterImageUrl
                    ? `<img src="${characterImageUrl}" alt="${char.name}" class="character-card-image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                       <div class="character-card-placeholder" style="display:none;">🤠</div>`
                    : `<div class="character-card-placeholder">🤠</div>`
                }
                <div class="character-card-name">${char.name}</div>
                <div class="character-card-stats">
                    <div class="character-card-stat">
                        <span>🃏</span>
                        <span>${char.known_spells_count || 0}</span>
                    </div>
                    <div class="character-card-stat">
                        <span>📕</span>
                        <span>${char.spellbooks_count || 0}</span>
                    </div>
                </div>
                <button class="character-delete-btn" data-character-id="${char.id}" title="Usuń tę postać">🗑️</button>
            </div>
        `;
        }).join('');

        // Add click handlers to character cards
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open character if delete button was clicked
                if (e.target.classList.contains('character-delete-btn')) return;
                
                const characterId = card.getAttribute('data-character-id');
                const character = userCharacters.find(c => c.id === parseInt(characterId));
                if (character) {
                    selectCharacter(character);
                }
            });
        });

        // Add delete handlers to character cards
        document.querySelectorAll('.character-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const characterId = btn.getAttribute('data-character-id');
                const character = userCharacters.find(c => String(c.id) === String(characterId));
                
                if (!character) return;
                
                if (confirm(`Czy na pewno chcesz usunąć postać "${character.name}" i wszystkie jej dane?\n\nTej operacji nie można cofnąć.`)) {
                    const { error } = await deleteCharacter(characterId);
                    if (error) {
                        alert(`Błąd usuwania postaci: ${error.message}`);
                        return;
                    }
                    
                    // If we were viewing this character, go back to list
                    if (currentCharacter && String(currentCharacter.id) === String(characterId)) {
                        currentCharacter = null;
                        characterDetailsView.style.display = 'none';
                    }
                    
                    // Reload characters list
                    await loadCharacters();
                }
            });
        });

        // Show spell management for all logged users (admins: all spells, users: own spells)
        const adminSpellManagement = document.getElementById('adminSpellManagement');
        if (adminSpellManagement) {
            adminSpellManagement.style.display = 'block';
            renderManageSpellsList();
        }
    } else {
        // Show character details
        document.querySelector('.character-management').style.display = 'none';
        characterDetailsView.style.display = 'block';
        
        // Update character header
        characterName.textContent = currentCharacter.name;
        const characterImageUrl = normalizeCharacterImageUrl(currentCharacter.image_url);
        if (characterImageUrl) {
            characterImage.onerror = () => {
                characterImage.style.display = 'none';
                characterImage.removeAttribute('src');
            };
            characterImage.src = characterImageUrl;
            characterImage.style.display = 'block';
            characterImage.classList.remove('character-image-placeholder');
            characterImage.classList.add('character-image');
        } else {
            characterImage.src = '';
            characterImage.style.display = 'none';
        }

        // Load character's known spells and spellbooks
        loadCharacterData();

        // Hide admin spell management when viewing character details
        const adminSpellManagement = document.getElementById('adminSpellManagement');
        if (adminSpellManagement) {
            adminSpellManagement.style.display = 'none';
        }
    }
}

async function selectCharacter(character) {
    currentCharacter = character;
    updateCharacterManagementView();
}

async function loadCharacterData() {
    if (!currentCharacter) return;

    // Load known spells
    const { data: spells, error: spellsError } = await getKnownSpellsForCharacter(currentCharacter.id);
    if (!spellsError && spells) {
        knownSpells = spells;
        updateCharacterKnownSpellsList();
    }

    // Load spellbooks
    const { data: spellbooks, error: spellbooksError } = await getSpellbooksForCharacter(currentCharacter.id);
    if (!spellbooksError && spellbooks) {
        userSpellbooks = spellbooks;
        updateCharacterSpellbooksList();
    }

    // Update userCharacters with fresh counts
    const charInList = userCharacters.find(c => String(c.id) === String(currentCharacter.id));
    if (charInList) {
        charInList.known_spells_count = knownSpells.length;
        charInList.spellbooks_count = userSpellbooks.length;
    }

    // Update character card stats with live counts
    updateCharacterCardStats();
    
    // Also update all cards on the list
    updateAllCharacterCardStats();
}

function updateCharacterKnownSpellsList() {
    characterKnownSpellsCount.textContent = knownSpells.length;

    if (knownSpells.length === 0) {
        characterKnownSpellsList.innerHTML = '<li style="color: var(--text-secondary); padding: 8px;">Brak znanych kantów.</li>';
        return;
    }

    characterKnownSpellsList.innerHTML = knownSpells.map((spell, idx) => `
        <li class="known-spell-item" draggable="true" data-spell-id="${spell.id}" data-index="${idx}">
            <span class="drag-handle">☰</span>
            <span class="known-spell-label">${spell.spell_name_pl} (${spell.spell_name_en})</span>
            <button class="known-remove-btn" data-spell-id="${spell.id}">Usuń</button>
        </li>
    `).join('');

    // Add remove handlers
    characterKnownSpellsList.querySelectorAll('.known-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const spellId = btn.getAttribute('data-spell-id');
            await removeKnownSpell(spellId);
            await loadCharacterData();
        });
    });

    // Drag & drop reordering
    initKnownSpellsDragDrop();
}

function initKnownSpellsDragDrop() {
    let draggedEl = null;
    let touchStartY = 0;

    characterKnownSpellsList.querySelectorAll('.known-spell-item[draggable]').forEach(item => {
        // Desktop Drag & Drop
        item.addEventListener('dragstart', (e) => {
            draggedEl = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            if (draggedEl) draggedEl.classList.remove('dragging');
            draggedEl = null;
            characterKnownSpellsList.querySelectorAll('.known-spell-item').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (item !== draggedEl) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            if (!draggedEl || draggedEl === item) return;

            // Reorder DOM
            const allItems = [...characterKnownSpellsList.querySelectorAll('.known-spell-item')];
            const fromIdx = allItems.indexOf(draggedEl);
            const toIdx = allItems.indexOf(item);
            if (fromIdx < toIdx) {
                item.after(draggedEl);
            } else {
                item.before(draggedEl);
            }

            // Persist new order to DB and local array
            const reordered = [...characterKnownSpellsList.querySelectorAll('.known-spell-item')];
            const updates = reordered.map((el, i) => {
                const id = el.getAttribute('data-spell-id');
                return { id, sort_order: i + 1 };  // 1-indexed
            });

            console.log('[Drag&Drop] Saving new order:', updates);

            // Update local knownSpells array order
            const idOrder = updates.map(u => u.id);
            knownSpells.sort((a, b) => idOrder.indexOf(String(a.id)) - idOrder.indexOf(String(b.id)));
            knownSpells.forEach((s, i) => { s.sort_order = i + 1; });

            // Save to DB with error tracking
            let hasErrors = false;
            for (const u of updates) {
                const { error } = await updateKnownSpellOrder(u.id, u.sort_order);
                if (error) {
                    console.error(`[Drag&Drop] Failed to save sort_order for spell ${u.id}:`, error);
                    hasErrors = true;
                } else {
                    console.log(`[Drag&Drop] Saved sort_order=${u.sort_order} for spell ${u.id}`);
                }
            }

            if (hasErrors) {
                alert('Nie udało się zapisać nowej kolejności. Sprawdź konsolę.');
                await loadCharacterData();  // Reload to restore previous order
            }
        });

        // Mobile Touch support
        item.addEventListener('touchstart', (e) => {
            draggedEl = item;
            touchStartY = e.touches[0].clientY;
            item.classList.add('dragging');
            item.style.opacity = '0.7';
        });

        item.addEventListener('touchmove', (e) => {
            if (!draggedEl) return;
            e.preventDefault();

            const touchY = e.touches[0].clientY;
            const allItems = [...characterKnownSpellsList.querySelectorAll('.known-spell-item')];

            // Find which item is under the touch point
            for (const el of allItems) {
                const rect = el.getBoundingClientRect();
                if (touchY >= rect.top && touchY <= rect.bottom) {
                    if (el !== draggedEl) {
                        characterKnownSpellsList.querySelectorAll('.known-spell-item').forEach(i => i.classList.remove('drag-over'));
                        el.classList.add('drag-over');
                    }
                    break;
                }
            }
        });

        item.addEventListener('touchend', async (e) => {
            if (!draggedEl) return;

            const touchY = e.changedTouches[0].clientY;
            const allItems = [...characterKnownSpellsList.querySelectorAll('.known-spell-item')];
            
            let targetEl = null;
            for (const el of allItems) {
                const rect = el.getBoundingClientRect();
                if (touchY >= rect.top && touchY <= rect.bottom && el !== draggedEl) {
                    targetEl = el;
                    break;
                }
            }

            characterKnownSpellsList.querySelectorAll('.known-spell-item').forEach(el => {
                el.classList.remove('dragging', 'drag-over');
                el.style.opacity = '1';
            });

            if (!targetEl) {
                draggedEl = null;
                return;
            }

            // Reorder DOM
            const fromIdx = allItems.indexOf(draggedEl);
            const toIdx = allItems.indexOf(targetEl);
            if (fromIdx < toIdx) {
                targetEl.after(draggedEl);
            } else {
                targetEl.before(draggedEl);
            }

            // Persist new order to DB
            const reordered = [...characterKnownSpellsList.querySelectorAll('.known-spell-item')];
            const updates = reordered.map((el, i) => {
                const id = el.getAttribute('data-spell-id');
                return { id, sort_order: i + 1 };
            });

            console.log('[Touch Reorder] Saving new order:', updates);

            const idOrder = updates.map(u => u.id);
            knownSpells.sort((a, b) => idOrder.indexOf(String(a.id)) - idOrder.indexOf(String(b.id)));
            knownSpells.forEach((s, i) => { s.sort_order = i + 1; });

            let hasErrors = false;
            for (const u of updates) {
                const { error } = await updateKnownSpellOrder(u.id, u.sort_order);
                if (error) {
                    console.error(`[Touch Reorder] Failed to save sort_order for spell ${u.id}:`, error);
                    hasErrors = true;
                } else {
                    console.log(`[Touch Reorder] Saved sort_order=${u.sort_order} for spell ${u.id}`);
                }
            }

            if (hasErrors) {
                alert('Nie udało się zapisać nowej kolejności.');
                await loadCharacterData();
            }

            draggedEl = null;
        });
    });
}

function updateCharacterSpellbooksList() {
    if (userSpellbooks.length === 0) {
        characterSpellbooksList.innerHTML = '<p style="color: var(--text-secondary); padding: 8px;">Brak ksiąg.</p>';
        return;
    }

    characterSpellbooksList.innerHTML = userSpellbooks.map(book => `
        <div class="spellbook-item" data-spellbook-id="${book.id}">
            <div class="spellbook-item-header">
                <strong>${book.name}</strong>
                <span class="spellbook-reliability">⭐ ${book.reliability}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers to open spellbook details
    characterSpellbooksList.querySelectorAll('.spellbook-item').forEach(item => {
        item.addEventListener('click', () => {
            const spellbookId = item.getAttribute('data-spellbook-id');
            console.log('[spellbook-click] Clicked spellbook ID:', spellbookId);
            console.log('[spellbook-click] userSpellbooks:', userSpellbooks);
            // Compare as string - IDs may be UUIDs or integers
            const spellbook = userSpellbooks.find(b => String(b.id) === String(spellbookId));
            console.log('[spellbook-click] Found spellbook:', spellbook);
            if (spellbook) {
                openSpellbookDetails(spellbook);
            } else {
                console.error('[spellbook-click] Spellbook not found for ID:', spellbookId);
            }
        });
    });
}

// ============================
// ADD KNOWN SPELL MODAL
// ============================

function renderAddKnownSpellResults() {
    const searchTerm = addKnownSpellSearch.value.toLowerCase().trim();
    
    let filteredSpells = allSpells;
    if (searchTerm) {
        filteredSpells = allSpells.filter(spell => {
            const namePL = (spell.NazwaPL || '').toLowerCase();
            const nameEN = (spell.Nazwa || '').toLowerCase();
            return namePL.includes(searchTerm) || nameEN.includes(searchTerm);
        });
    }

    // Limit results to 50 for performance
    const displaySpells = filteredSpells.slice(0, 50);

    if (displaySpells.length === 0) {
        addKnownSpellResults.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">Nie znaleziono zaklęć.</p>';
        return;
    }

    addKnownSpellResults.innerHTML = displaySpells.map(spell => {
        const isKnown = getKnownSpellEntry(spell);
        return `
            <div class="add-known-spell-item ${isKnown ? 'already-known' : ''}" data-spell-id="${spell.id}">
                <div class="spell-info">
                    <div class="spell-name">${spell.NazwaPL || spell.Nazwa}</div>
                    <div class="spell-name-en">${spell.Nazwa || ''}</div>
                </div>
                ${!isKnown ? `<button class="btn-add-known">Dodaj</button>` : `<span class="already-known-badge">✓ Znane</span>`}
            </div>
        `;
    }).join('');

    // Add click handlers
    addKnownSpellResults.querySelectorAll('.btn-add-known').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.add-known-spell-item');
            const spellId = parseInt(item.getAttribute('data-spell-id'));
            const spell = allSpells.find(s => s.id === spellId);
            if (spell) {
                await addKnownSpellToCharacter(currentCharacter.id, spell.NazwaPL || '', spell.Nazwa || '');
                await loadCharacterData();
                renderAddKnownSpellResults(); // Refresh list
            }
        });
    });
}

// ============================
// SPELLBOOK DETAILS WITH TABS
// ============================

function switchSpellbookTab(tabName) {
    // Update tab buttons
    spellbookTabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });

    // Hide all tabs
    currentSpellsTab.classList.remove('active');
    if (missingSpellsTab) missingSpellsTab.classList.remove('active');
    availableSpellsTab.classList.remove('active');

    // Show selected tab
    if (tabName === 'current-spells') {
        currentSpellsTab.classList.add('active');
    } else if (tabName === 'missing-spells') {
        if (missingSpellsTab) missingSpellsTab.classList.add('active');
        renderMissingSpellsForSpellbook();
    } else if (tabName === 'available-spells') {
        availableSpellsTab.classList.add('active');
        renderAvailableSpellsForSpellbook();
    }
}

async function openSpellbookDetails(spellbook) {
    currentSpellbook = spellbook;
    
    document.getElementById('spellbookDetailsTitle').textContent = spellbook.name;
    document.getElementById('spellbookDetailsReliability').textContent = spellbook.reliability;

    // Load and render present spells
    await renderPresentSpellsForSpellbook();

    // Switch to first tab and open modal
    switchSpellbookTab('current-spells');
    spellbookDetailsModal.style.display = 'block';
}

async function renderPresentSpellsForSpellbook() {
    if (!currentSpellbook) return;

    const { data: spells, error } = await getSpellbookSpells(currentSpellbook.id, 'present');
    
    const countEl = document.getElementById('spellbookDetailsCount');
    const spellsContainer = document.getElementById('spellbookDetailsSpells');
    
    if (error || !spells) {
        countEl.textContent = '0';
        spellsContainer.innerHTML = '<p style="color:#ff6b6b;">Błąd ładowania.</p>';
        return;
    }
    
    countEl.textContent = spells.length;
    
    if (spells.length === 0) {
        spellsContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">Brak zaklęć w tej księdze.</p>';
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

        spellsContainer.querySelectorAll('.spellbook-spell-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const spellId = btn.getAttribute('data-spell-id');
                const { error } = await removeSpellFromSpellbook(spellId);
                if (!error) {
                    await renderPresentSpellsForSpellbook();
                } else {
                    alert(`Błąd usuwania: ${error.message}`);
                }
            });
        });
    }
}

async function renderMissingSpellsForSpellbook() {
    if (!currentSpellbook || !spellbookMissingSpells) return;

    const { data: spells, error } = await getSpellbookSpells(currentSpellbook.id, 'missing');
    
    if (error || !spells) {
        spellbookMissingSpells.innerHTML = '<p style="color:#ff6b6b;">Błąd ładowania.</p>';
        return;
    }
    
    if (spells.length === 0) {
        spellbookMissingSpells.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">Brak oznaczonych brakujących zaklęć.</p>';
    } else {
        spellbookMissingSpells.innerHTML = spells.map(spell => {
            const label = spell.spell_name_pl || spell.spell_name_en || '-';
            return `
                <div class="spellbook-spell-item missing-spell-item">
                    <span class="spellbook-spell-name">${label}</span>
                    <button class="spellbook-spell-remove" data-spell-id="${spell.id}">Usuń</button>
                </div>
            `;
        }).join('');

        spellbookMissingSpells.querySelectorAll('.spellbook-spell-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const spellId = btn.getAttribute('data-spell-id');
                const { error } = await removeSpellFromSpellbook(spellId);
                if (!error) {
                    await renderMissingSpellsForSpellbook();
                } else {
                    alert(`Błąd usuwania: ${error.message}`);
                }
            });
        });
    }
}

async function renderAvailableSpellsForSpellbook() {
    if (!currentSpellbook) return;

    const searchTerm = spellbookAvailableSearch.value.toLowerCase().trim();
    
    // Get ALL spells in spellbook (both present and missing) to exclude them
    const { data: allBookSpells } = await getSpellbookSpells(currentSpellbook.id);
    const bookSpellNames = new Set();
    if (allBookSpells) {
        allBookSpells.forEach(spell => {
            if (spell.spell_name_pl) bookSpellNames.add(spell.spell_name_pl.toLowerCase());
            if (spell.spell_name_en) bookSpellNames.add(spell.spell_name_en.toLowerCase());
        });
    }

    // Filter: only spells not yet categorized in this spellbook
    let availableSpells = allSpells.filter(spell => {
        const namePL = (spell.NazwaPL || '').toLowerCase();
        const nameEN = (spell.Nazwa || '').toLowerCase();
        return !bookSpellNames.has(namePL) && !bookSpellNames.has(nameEN);
    });

    if (searchTerm) {
        availableSpells = availableSpells.filter(spell => {
            const namePL = (spell.NazwaPL || '').toLowerCase();
            const nameEN = (spell.Nazwa || '').toLowerCase();
            return namePL.includes(searchTerm) || nameEN.includes(searchTerm);
        });
    }

    const displaySpells = availableSpells.slice(0, 50);

    if (displaySpells.length === 0) {
        spellbookAvailableSpells.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">Nie znaleziono zaklęć.</p>';
        return;
    }

    spellbookAvailableSpells.innerHTML = displaySpells.map(spell => `
        <div class="available-spell-item" data-spell-id="${spell.id}">
            <div class="spell-info">
                <div class="spell-name">${spell.NazwaPL || spell.Nazwa}</div>
                <div class="spell-name-en">${spell.Nazwa || ''}</div>
            </div>
            <div class="spell-status-buttons">
                <button class="btn-mark-present" title="Zaklęcie jest w księdze">✅ W księdze</button>
                <button class="btn-mark-missing" title="Zaklęcia brakuje w księdze">❌ Brak</button>
            </div>
        </div>
    `).join('');

    // Add click handlers for "present" buttons
    spellbookAvailableSpells.querySelectorAll('.btn-mark-present').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const item = e.target.closest('.available-spell-item');
            await addSpellToBookWithStatus(item, 'present', btn);
        });
    });

    // Add click handlers for "missing" buttons
    spellbookAvailableSpells.querySelectorAll('.btn-mark-missing').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const item = e.target.closest('.available-spell-item');
            await addSpellToBookWithStatus(item, 'missing', btn);
        });
    });
}

async function addSpellToBookWithStatus(itemEl, status, btn) {
    const spellId = itemEl.getAttribute('data-spell-id');
    const spell = allSpells.find(s => String(s.id) === String(spellId));
    
    if (!spell) return;

    // Disable buttons during operation
    const buttons = itemEl.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
    btn.textContent = '⏳';

    try {
        const { data, error } = await addSpellToSpellbook(
            currentSpellbook.id,
            spell.NazwaPL || '',
            spell.Nazwa || '',
            status
        );

        if (error) {
            if (error.code === '23505') {
                alert('To zaklęcie jest już w tej księdze!');
            } else {
                alert(`Błąd: ${error.message}`);
            }
            buttons.forEach(b => b.disabled = false);
            btn.textContent = status === 'present' ? '✅ W księdze' : '❌ Brak';
            return;
        }

        // Remove the item from the list with animation
        itemEl.style.opacity = '0.3';
        itemEl.style.transition = 'opacity 0.3s';
        setTimeout(() => itemEl.remove(), 300);

        // Update present spells count and re-render the list
        const { data: presentSpells } = await getSpellbookSpells(currentSpellbook.id, 'present');
        if (presentSpells) {
            document.getElementById('spellbookDetailsCount').textContent = presentSpells.length;
        }

        // Re-render the "W księdze" tab to show updated list
        await renderPresentSpellsForSpellbook();

    } catch (err) {
        alert('Nie udało się dodać czaru');
        buttons.forEach(b => b.disabled = false);
        btn.textContent = status === 'present' ? '✅ W księdze' : '❌ Brak';
    }
}

async function handleDeleteSpellbook() {
    if (!currentSpellbook) return;

    if (confirm(`Czy na pewno chcesz usunąć księgę "${currentSpellbook.name}"?`)) {
        const { error } = await deleteSpellbook(currentSpellbook.id);
        if (error) {
            alert(`Błąd usuwania księgi: ${error.message}`);
            return;
        }

        spellbookDetailsModal.style.display = 'none';
        currentSpellbook = null;
        await loadCharacterData();
    }
}

async function handleCreateCharacter(e) {
    e.preventDefault();
    
    const name = newCharacterName.value.trim();
    const rawImageUrl = newCharacterImageUrl.value.trim();
    const imageUrl = rawImageUrl ? normalizeCharacterImageUrl(rawImageUrl) : null;

    const errorDiv = document.getElementById('createCharacterError');
    const successDiv = document.getElementById('createCharacterSuccess');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!name) {
        errorDiv.textContent = 'Imię postaci jest wymagane.';
        errorDiv.style.display = 'block';
        return;
    }

    if (rawImageUrl && !imageUrl) {
        errorDiv.textContent = 'Nieprawidłowy URL obrazka. Użyj pełnego linku HTTPS.';
        errorDiv.style.display = 'block';
        return;
    }

    const { data, error } = await createCharacter(currentUser.id, name, imageUrl);

    if (error) {
        errorDiv.textContent = `Błąd: ${error.message}`;
        errorDiv.style.display = 'block';
        return;
    }

    successDiv.textContent = 'Postać utworzona pomyślnie!';
    successDiv.style.display = 'block';

    createCharacterForm.reset();
    
    setTimeout(() => {
        createCharacterModal.style.display = 'none';
        successDiv.style.display = 'none';
    }, 1500);

    await loadCharacters();
}

async function handleEditCharacterName(e) {
    e.preventDefault();
    
    const name = editCharacterNameInput.value.trim();
    const errorDiv = document.getElementById('editCharacterNameError');

    errorDiv.style.display = 'none';

    if (!name) {
        errorDiv.textContent = 'Imię postaci jest wymagane.';
        errorDiv.style.display = 'block';
        return;
    }

    const { data, error } = await updateCharacter(currentCharacter.id, { name });

    if (error) {
        errorDiv.textContent = `Błąd: ${error.message}`;
        errorDiv.style.display = 'block';
        return;
    }

    currentCharacter.name = name;
    editCharacterNameModal.style.display = 'none';
    updateCharacterManagementView();
    await loadCharacters();
}

async function handleChangeCharacterImage(e) {
    e.preventDefault();
    
    const rawImageUrl = editCharacterImageUrl.value.trim();
    const imageUrl = rawImageUrl ? normalizeCharacterImageUrl(rawImageUrl) : null;
    const errorDiv = document.getElementById('changeCharacterImageError');

    errorDiv.style.display = 'none';

    if (rawImageUrl && !imageUrl) {
        errorDiv.textContent = 'Nieprawidłowy URL obrazka. Użyj pełnego linku HTTPS.';
        errorDiv.style.display = 'block';
        return;
    }

    const { data, error } = await updateCharacter(currentCharacter.id, { image_url: imageUrl });

    if (error) {
        errorDiv.textContent = `Błąd: ${error.message}`;
        errorDiv.style.display = 'block';
        return;
    }

    currentCharacter.image_url = imageUrl;
    changeCharacterImageModal.style.display = 'none';
    updateCharacterManagementView();
    await loadCharacters();
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
            userCharacters = [];
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
            userCharacters = [];
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
    
    // Load characters (known spells and spellbooks are loaded per-character)
    await loadCharacters();
    
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
    userCharacters = [];
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
    userCharacters = [];
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

    // Check if we have a current character, otherwise try to use the first one
    if (!currentCharacter) {
        if (userCharacters.length === 0) {
            alert('Utwórz kanciarza w Biurze Szeryfa, aby dodawać znane kanty.');
            return;
        } else if (userCharacters.length === 1) {
            // Auto-select the only character
            currentCharacter = userCharacters[0];
        } else {
            alert('Wybierz kanciarza w Biurze Szeryfa przed dodaniem kanta.');
            return;
        }
    }

    knownSpellActionInProgress = true;

    const toggleKnownSpellBtn = document.getElementById('toggleKnownSpellBtn');
    if (toggleKnownSpellBtn) {
        toggleKnownSpellBtn.disabled = true;
    }

    const existingEntry = getKnownSpellEntry(spell);

    if (existingEntry) {
        const { error } = await removeKnownSpell(existingEntry.id);
        if (error) {
            console.error('Błąd usuwania znanego zaklęcia:', error);
            alert(`Nie udało się usunąć: ${error.message || 'nieznany błąd'}`);
            knownSpellActionInProgress = false;
            if (toggleKnownSpellBtn) toggleKnownSpellBtn.disabled = false;
            return;
        }
    } else {
        const { error } = await addKnownSpellToCharacter(currentCharacter.id, spell.NazwaPL || '', spell.Nazwa || '');
        if (error) {
            console.error('Błąd dodawania znanego zaklęcia:', error);
            alert(`Nie udało się dodać: ${error.message || 'nieznany błąd'}`);
            knownSpellActionInProgress = false;
            if (toggleKnownSpellBtn) toggleKnownSpellBtn.disabled = false;
            return;
        }
    }

    // Reload character data if we're in character details view
    if (currentCharacter && characterDetailsView.style.display !== 'none') {
        await loadCharacterData();
    }

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
    
    if (!currentUser || !currentCharacter) {
        showSpellbookMessage('Wybierz kanciarza, aby utworzyć księgę Hoyla.', true);
        return;
    }

    const name = spellbookNameInput.value.trim();
    const reliability = parseInt(spellbookReliabilityInput.value);

    if (!name) {
        showSpellbookMessage('Nazwa księgi jest wymagana.', true);
        return;
    }

    try {
        const { data, error } = await createSpellbookForCharacter(currentCharacter.id, name, reliability);
        if (error) {
            console.error('[handleCreateSpellbook] Error:', error);
            showSpellbookMessage(`Błąd: ${error.message}`, true);
            return;
        }

        showSpellbookMessage('Księga Hoyla utworzona!', false);
        spellbookNameInput.value = '';
        spellbookReliabilityInput.value = '1';
        reliabilityValueDisplay.textContent = '1';
        
        setTimeout(() => {
            createSpellbookModal.style.display = 'none';
        }, 1000);

        await loadCharacterData();
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

function openAddToSpellbookModal(spell) {
    if (!currentUser || !currentCharacter) {
        alert('Wybierz kanciarza w Biurze Szeryfa, aby dodać kant do księgi.');
        return;
    }

    if (userSpellbooks.length === 0) {
        alert('Najpierw utwórz księgę w sekcji Zarządzanie!');
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
                    <button class="btn-add-to-spellbook-final" data-book-id="${book.id}">Dodaj</button>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    selectionList.querySelectorAll('.btn-add-to-spellbook-final').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const bookId = btn.getAttribute('data-book-id');
            await addSpellToSelectedSpellbook(bookId);
        });
    });

    addToSpellbookModal.style.display = 'block';
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
// ===================================
// Preview/Export Functions
// ===================================

// Shared function to enrich a spell name reference with full data from allSpells
function enrichSpellByName(spellNamePl, spellNameEn) {
    const namePL = (spellNamePl || '').toLowerCase();
    const nameEN = (spellNameEn || '').toLowerCase();
    return allSpells.find(spell => {
        const spellNamePL = (spell.NazwaPL || '').toLowerCase();
        const spellNameEN = (spell.Nazwa || '').toLowerCase();
        return (namePL && spellNamePL === namePL) || (nameEN && spellNameEN === nameEN);
    }) || null;
}

// Render a single spell block with compressed stats + poker hands
function renderPreviewSpellBlock(spell, index) {
    if (!spell) return '';
    
    const isKant = spell.type === 'kant';
    const typeName = isKant ? 'Kant' : 'Sztuczka';
    
    let html = `
        <div class="preview-spell-item">
            <div class="preview-spell-header">
                <h3>${index + 1}. ${spell.NazwaPL || spell.Nazwa || '?'}</h3>
                <span class="preview-spell-type ${isKant ? 'type-kant' : 'type-sztuczka'}">${typeName}</span>
            </div>
            ${spell.NazwaPL && spell.Nazwa ? `<p class="preview-spell-name-en">${spell.Nazwa}</p>` : ''}
            
            <div class="preview-spell-stats">
                <div class="preview-stat"><span class="preview-stat-label">Źródło</span><span class="preview-stat-value">${spell['Źródło'] || '-'}</span></div>
                <div class="preview-stat"><span class="preview-stat-label">Cecha</span><span class="preview-stat-value">${spell.Cecha || '-'}</span></div>`;
    
    if (isKant) {
        html += `
                <div class="preview-stat"><span class="preview-stat-label">Min. Ręka</span><span class="preview-stat-value">${spell['Min. Ręka'] || '-'}</span></div>
                <div class="preview-stat"><span class="preview-stat-label">Rzucanie</span><span class="preview-stat-value">${spell.Rzucanie || '-'}</span></div>
                <div class="preview-stat"><span class="preview-stat-label">Czas</span><span class="preview-stat-value">${spell.Czas || '-'}</span></div>
                <div class="preview-stat"><span class="preview-stat-label">Zasięg</span><span class="preview-stat-value">${spell['Zasięg'] || '-'}</span></div>`;
    }
    
    html += `</div>`;
    
    // Description
    if (spell.Opis) {
        html += `<div class="preview-spell-description">${spell.Opis}</div>`;
    }
    
    // Poker hand effects table — show only hands with effects
    if (isKant) {
        const effects = HAND_NAMES.filter(hand => spell[hand] && spell[hand].trim() !== '');
        if (effects.length > 0) {
            html += `<table class="preview-effects-table">
                        <thead><tr><th>Ręka</th><th>Efekt</th></tr></thead>
                        <tbody>`;
            effects.forEach(hand => {
                html += `<tr><td class="preview-hand-name">${hand}</td><td>${spell[hand]}</td></tr>`;
            });
            html += `</tbody></table>`;
        }
    }
    
    html += `</div>`;
    return html;
}

async function handlePreviewKnownSpells() {
    if (!currentCharacter) {
        alert('Wybierz najpierw postać');
        return;
    }

    previewTitle.textContent = `Znane Kanty: ${currentCharacter.name}`;
    
    const { data: knownSpellsData, error } = await getKnownSpellsForCharacter(currentCharacter.id);
    
    if (error) {
        previewContent.innerHTML = '<p style="color: #ff6b6b;">Błąd podczas ładowania czarów.</p>';
        previewExportModal.style.display = 'flex';
        return;
    }

    if (!knownSpellsData || knownSpellsData.length === 0) {
        previewContent.innerHTML = '<p>Brak znanych czarów dla tej postaci.</p>';
        previewExportModal.style.display = 'flex';
        return;
    }

    const fullSpells = knownSpellsData
        .map(ks => enrichSpellByName(ks.spell_name_pl, ks.spell_name_en))
        .filter(Boolean);

    let html = '<div class="preview-spells-list">';
    fullSpells.forEach((spell, i) => { html += renderPreviewSpellBlock(spell, i); });
    html += '</div>';
    
    previewContent.innerHTML = html;
    previewExportModal.style.display = 'flex';
}

async function handlePreviewSpellbook() {
    if (!currentSpellbook) {
        alert('Nie wybrano księgi do podglądu');
        return;
    }

    previewTitle.textContent = `Księga: ${currentSpellbook.name} (Niezawodność: ${currentSpellbook.reliability})`;
    
    const { data: presentSpells } = await getSpellbookSpells(currentSpellbook.id, 'present');
    const { data: missingSpells } = await getSpellbookSpells(currentSpellbook.id, 'missing');

    const sortAlpha = (a, b) => (a.spell_name_pl || a.spell_name_en || '').localeCompare(b.spell_name_pl || b.spell_name_en || '');
    const present = (presentSpells || []).sort(sortAlpha);
    const missing = (missingSpells || []).sort(sortAlpha);

    if (present.length === 0 && missing.length === 0) {
        previewContent.innerHTML = '<p>Brak czarów w tej księdze.</p>';
        previewExportModal.style.display = 'flex';
        return;
    }

    const renderNameList = (spells) => {
        if (spells.length === 0) return '<p style="color:var(--text-secondary);font-style:italic;margin:4px 0;">Brak</p>';
        let ol = '<ol>';
        spells.forEach(s => {
            const pl = s.spell_name_pl || '';
            const en = s.spell_name_en || '';
            ol += `<li>${pl}${en ? ` <span class="spell-en">(${en})</span>` : ''}</li>`;
        });
        ol += '</ol>';
        return ol;
    };

    let html = `<div class="preview-book-columns">
        <div class="preview-book-col">
            <h3 class="col-present">✅ W księdze (${present.length})</h3>
            ${renderNameList(present)}
        </div>
        <div class="preview-book-col">
            <h3 class="col-missing">❌ Brak w księdze (${missing.length})</h3>
            ${renderNameList(missing)}
        </div>
    </div>`;

    previewContent.innerHTML = html;
    previewExportModal.style.display = 'flex';
}

function handleExportToPDF() {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert('Proszę zezwolić na wyskakujące okna dla eksportu PDF');
        return;
    }
    
    const title = previewTitle.textContent;
    const content = previewContent.innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #222; }
                h1 { color: #333; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                
                /* Spellbook two-column layout */
                .preview-book-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .preview-book-col { border: 1px solid #ddd; border-radius: 6px; padding: 14px 18px; }
                .preview-book-col h3 { margin: 0 0 10px; font-size: 1.05em; padding-bottom: 8px; border-bottom: 1px solid #ddd; }
                .preview-book-col h3.col-present { color: #2e7d32; }
                .preview-book-col h3.col-missing { color: #c62828; }
                .preview-book-col ol { margin: 0; padding-left: 22px; }
                .preview-book-col li { font-size: 0.92em; padding: 2px 0; }
                .preview-book-col li .spell-en { color: #888; font-style: italic; font-size: 0.85em; }

                /* Known spells detail cards */
                .preview-spell-item { margin-bottom: 20px; padding: 14px; border: 1px solid #ddd; border-radius: 6px; page-break-inside: avoid; }
                .preview-spell-header { display: flex; justify-content: space-between; align-items: center; }
                .preview-spell-header h3 { margin: 0; color: #1565c0; font-size: 1.05em; }
                .preview-spell-type { font-size: 0.72em; font-weight: 700; padding: 3px 8px; border-radius: 3px; text-transform: uppercase; }
                .type-kant { background: #e3f2fd; color: #1565c0; }
                .type-sztuczka { background: #f3e5f5; color: #7b1fa2; }
                .preview-spell-name-en { color: #666; font-style: italic; margin: 2px 0 6px; font-size: 0.88em; }
                
                .preview-spell-stats { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 6px 0; padding: 6px 10px; background: #f5f5f5; border-radius: 4px; font-size: 0.85em; }
                .preview-stat { display: flex; align-items: baseline; gap: 4px; }
                .preview-stat-label { font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.4px; color: #888; font-weight: 600; }
                .preview-stat-label::after { content: ':'; }
                .preview-stat-value { font-weight: 500; color: #333; }
                
                .preview-spell-description { margin: 6px 0; padding: 8px 10px; background: #fafafa; border-left: 3px solid #1565c0; font-size: 0.88em; line-height: 1.45; }
                
                .preview-effects-table { width: 100%; border-collapse: collapse; font-size: 0.85em; margin-top: 6px; }
                .preview-effects-table th { text-align: left; background: #e8eaf6; padding: 4px 8px; border: 1px solid #c5cae9; font-size: 0.82em; }
                .preview-effects-table td { padding: 4px 8px; border: 1px solid #e0e0e0; vertical-align: top; line-height: 1.3; }
                .preview-hand-name { font-weight: 600; white-space: nowrap; width: 110px; color: #333; }
                
                @media print {
                    body { margin: 0; }
                    .preview-spell-item { page-break-inside: avoid; }
                    .preview-book-columns { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${content}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = function() { printWindow.print(); };
}