// Data storage
let allSpells = [];
let filteredSpells = [];
let filteredCardsSpells = [];

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
document.addEventListener('DOMContentLoaded', () => {
    // Check if Papa Parse is loaded
    if (typeof Papa === 'undefined') {
        console.error('Papa Parse nie załadowany!');
        spellsBody.innerHTML = '<tr class="loading-row"><td colspan="9">Błąd: Biblioteka Papa Parse nie załadowana</td></tr>';
        return;
    }
    
    loadData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
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
}

// Load CSV data
async function loadData() {
    try {
        console.log('Rozpoczęcie wczytywania CSV...');
        const kantResponse = await fetch('Dane/kanty_v2 - kanty_v2.csv');
        const sztuResponse = await fetch('Dane/kanty_v2 - Sztuczki.csv');

        if (!kantResponse.ok) throw new Error(`Błąd HTTP: ${kantResponse.status}`);
        if (!sztuResponse.ok) throw new Error(`Błąd HTTP: ${sztuResponse.status}`);

        const kantText = await kantResponse.text();
        const sztuText = await sztuResponse.text();

        console.log('CSV wczytane, parseowanie...');

        const kantsParsed = Papa.parse(kantText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false
        });

        const sztuczParsed = Papa.parse(sztuText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false
        });

        const kanty = kantsParsed.data;
        const sztuczki = sztuczParsed.data;

        console.log(`Kantów wczytano: ${kanty.length}, Sztuczek wczytano: ${sztuczki.length}`);

        // Process kanty
        allSpells = kanty.map(spell => ({
            ...spell,
            type: 'kant',
            nazwaLower: spell.NazwaPL ? spell.NazwaPL.toLowerCase() : '',
            nazwaEnLower: spell.Nazwa ? spell.Nazwa.toLowerCase() : ''
        }));

        // Process sztuczki
        const sztuczkyProcessed = sztuczki.map(spell => ({
            ...spell,
            type: 'sztuka',
            nazwaLower: spell.NazwaPL ? spell.NazwaPL.toLowerCase() : '',
            nazwaEnLower: spell.Nazwa ? spell.Nazwa.toLowerCase() : '',
            // Add empty columns for consistency with kanty
            'Min. Ręka': '-',
            'Czas': '-',
            'Zasięg': '-',
            'Rzucanie': '-'
        }));

        allSpells = [...allSpells, ...sztuczkyProcessed];
        
        console.log(`Łącznie zaklęć: ${allSpells.length}`);

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
        spellsBody.innerHTML = '<tr class="loading-row"><td colspan="10">Błąd wczytywania plików CSV: ' + error.message + '</td></tr>';
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
            ${spell.type === 'kant' ? '<button class="btn-show-effects" id="showEffectsBtn">Zobacz Efekty</button>' : ''}
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

    // Initialize card view focus when switching to card view
    if (tabName === 'card-view') {
        setTimeout(() => {
            cardSearchInput.focus();
        }, 100);
    }
}
