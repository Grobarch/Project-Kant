// Data storage
let allSpells = [];
let filteredSpells = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const sourceFilter = document.getElementById('sourceFilter');
const featureFilter = document.getElementById('featureFilter');
const resetBtn = document.getElementById('resetFilters');
const spellsBody = document.getElementById('spellsBody');
const resultsCount = document.getElementById('resultsCount');
const detailsPanel = document.getElementById('detailsPanel');
const closeDetailsBtn = document.getElementById('closeDetails');

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
    searchInput.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    sourceFilter.addEventListener('change', applyFilters);
    featureFilter.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    closeDetailsBtn.addEventListener('click', () => {
        detailsPanel.style.display = 'none';
    });
    detailsPanel.addEventListener('click', (e) => {
        if (e.target === detailsPanel) {
            detailsPanel.style.display = 'none';
        }
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

    renderSpells();
    updateResultsCount();
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
            <td><span class="type-badge ${spell.type}">${spell.type === 'kant' ? 'KANT' : 'SZTUKA'}</span></td>
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
