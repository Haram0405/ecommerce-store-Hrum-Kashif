/* ============================================================
   filters.js — Search, category, sort state + logic (Section B)
   ============================================================ */

import { renderProducts, updateProductCount } from './products.js';

/* ---------- State ---------- */
const filterState = {
  search:   '',
  category: 'all',
  sort:     'default',
};

const PAGE_SIZE = 8; // products revealed per batch

const paginationState = {
  visibleCount: PAGE_SIZE,  // how many of the filtered results are shown
};

/* ---------- Internal references ---------- */
let allProducts  = [];   // master list — never mutated
const productGrid = () => document.getElementById('productGrid');
const emptyState  = () => document.getElementById('emptyState');

/* ============================================================
   PUBLIC API
   ============================================================ */

/**
 * Bootstrap: store master list, build all filter UI, run initial render.
 * Called from app.js after a successful product fetch.
 *
 * @param {Array} products - Full product list from API.
 */
function initializeFilters(products) {
  allProducts = products;

  renderSearchBar();
  renderCategoryButtons(extractCategories(products));
  renderSortDropdown();
  renderClearButton();

  applyFiltersAndSort();
}

/**
 * Master apply function.
 * Runs every filter and sort in order, slices to the visible page,
 * renders the grid, and updates the Load More button.
 *
 * @param {boolean} [append=false] - If true, appends next batch instead of re-rendering.
 */
function applyFiltersAndSort(append = false) {
  let result = filterByCategory(allProducts, filterState.category);
  result     = filterBySearch(result, filterState.search);
  result     = sortProducts(result, filterState.sort);

  updateProductCount(result.length);
  syncCategoryButtonStates();

  const grid = productGrid();

  if (result.length === 0) {
    grid.innerHTML = '';
    hideEmptyState();
    showEmptyState();
    renderLoadMoreButton(0, 0);
    return;
  }

  hideEmptyState();

  // Slice to the currently visible window
  const visible = result.slice(0, paginationState.visibleCount);

  if (append) {
    // Append only the newly revealed cards (avoid re-rendering existing ones)
    const newCards = result.slice(paginationState.visibleCount - PAGE_SIZE, paginationState.visibleCount);
    renderProducts(newCards, grid, true);
  } else {
    renderProducts(visible, grid, false);
  }

  renderLoadMoreButton(paginationState.visibleCount, result.length);
}

/**
 * Clears search, category, and sort back to defaults.
 * Resets all UI controls and re-renders the full list.
 */
function clearAllFilters() {
  filterState.search   = '';
  filterState.category = 'all';
  filterState.sort     = 'default';

  // Reset search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    toggleSearchClear('');
  }

  // Reset sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'default';

  // Reset pagination back to first page
  paginationState.visibleCount = PAGE_SIZE;

  applyFiltersAndSort();
}

/* ============================================================
   FILTER LOGIC
   ============================================================ */

/**
 * @param {Array}  products
 * @param {string} category - 'all' or a category string
 * @returns {Array}
 */
function filterByCategory(products, category) {
  if (category === 'all') return products;
  return products.filter(p => p.category === category);
}

/**
 * @param {Array}  products
 * @param {string} query
 * @returns {Array}
 */
function filterBySearch(products, query) {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(p => p.title.toLowerCase().includes(q));
}

/**
 * @param {Array}  products
 * @param {string} sortKey
 * @returns {Array} New sorted array (original untouched)
 */
function sortProducts(products, sortKey) {
  const list = [...products];

  switch (sortKey) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);

    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);

    case 'rating-desc':
      return list.sort((a, b) => (b.rating?.rate ?? 0) - (a.rating?.rate ?? 0));

    case 'name-asc':
      return list.sort((a, b) => a.title.localeCompare(b.title));

    default:
      return list; // preserve API order
  }
}

/* ============================================================
   UI BUILDERS
   ============================================================ */

/**
 * Creates a debounced version of a function using a closure.
 * The returned function delays invoking `fn` until `delay` ms have
 * elapsed since the last call. Each new call resets the timer.
 *
 * @param {Function} fn    - The function to debounce.
 * @param {number}   delay - Wait time in milliseconds.
 * @returns {Function}     - The debounced wrapper function.
 */
function debounce(fn, delay) {
  let timer;                          // closed over — private to this debounced fn
  return function (...args) {
    clearTimeout(timer);              // reset on every call
    timer = setTimeout(() => {
      fn.apply(this, args);           // invoke original fn after silence
    }, delay);
  };
}

/**
 * Builds the search bar and injects it into #searchBarContainer.
 */
function renderSearchBar() {
  const container = document.getElementById('searchBarContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="search-wrap">
      <i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>
      <input
        type="search"
        id="searchInput"
        class="search-input"
        placeholder="Search products…"
        autocomplete="off"
        aria-label="Search products"
      />
      <button
        class="search-clear"
        id="searchClear"
        aria-label="Clear search"
        hidden
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  `;

  const input    = container.querySelector('#searchInput');
  const clearBtn = container.querySelector('#searchClear');

  // Debounced handler: waits 300ms after the user stops typing
  const handleSearch = debounce((value) => {
    filterState.search           = value;
    paginationState.visibleCount = PAGE_SIZE; // new search → back to page 1
    applyFiltersAndSort();
  }, 300);

  input.addEventListener('input', () => {
    toggleSearchClear(input.value);
    handleSearch(input.value);        // each keystroke resets the 300ms timer
  });

  clearBtn.addEventListener('click', () => {
    input.value        = '';
    filterState.search = '';
    toggleSearchClear('');
    paginationState.visibleCount = PAGE_SIZE;
    input.focus();
    applyFiltersAndSort();            // clear is instant — no debounce needed
  });
}

/**
 * Builds category pill buttons from a sorted list of category strings.
 * Injects them into #categoryButtons.
 *
 * @param {string[]} categories
 */
function renderCategoryButtons(categories) {
  const container = document.getElementById('categoryButtons');
  if (!container) return;

  container.innerHTML = '';

  const allBtn = buildCategoryPill('all', 'All');
  container.appendChild(allBtn);

  categories.forEach(cat => {
    container.appendChild(buildCategoryPill(cat, formatCategoryLabel(cat)));
  });
}

/**
 * Creates a single category pill <button>.
 * @param {string} value
 * @param {string} label
 * @returns {HTMLButtonElement}
 */
function buildCategoryPill(value, label) {
  const btn = document.createElement('button');
  btn.className      = 'category-pill';
  btn.dataset.category = value;
  btn.textContent    = label;
  btn.setAttribute('aria-pressed', value === filterState.category ? 'true' : 'false');

  if (value === filterState.category) btn.classList.add('is-active');

  btn.addEventListener('click', () => {
    filterState.category         = value;
    paginationState.visibleCount = PAGE_SIZE; // category change → back to page 1
    applyFiltersAndSort();
  });

  return btn;
}

/**
 * Builds the sort <select> and injects it into #sortContainer.
 */
function renderSortDropdown() {
  const container = document.getElementById('sortContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="sort-wrap">
      <i class="fa-solid fa-arrow-up-wide-short sort-icon" aria-hidden="true"></i>
      <select id="sortSelect" class="sort-select" aria-label="Sort products">
        <option value="default">Sort: Default</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating-desc">Rating: Best First</option>
        <option value="name-asc">Name: A to Z</option>
      </select>
      <i class="fa-solid fa-chevron-down sort-chevron" aria-hidden="true"></i>
    </div>
  `;

  container.querySelector('#sortSelect').addEventListener('change', (e) => {
    filterState.sort             = e.target.value;
    paginationState.visibleCount = PAGE_SIZE; // sort change → back to page 1
    applyFiltersAndSort();
  });
}

/**
 * Renders the "Clear Filters" button into #clearFiltersContainer.
 */
function renderClearButton() {
  const container = document.getElementById('clearFiltersContainer');
  if (!container) return;

  container.innerHTML = `
    <button class="btn-clear-filters" id="clearFiltersBtn" aria-label="Clear all filters">
      <i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i>
      Clear filters
    </button>
  `;

  container.querySelector('#clearFiltersBtn').addEventListener('click', clearAllFilters);
}

/* ============================================================
   UI SYNC HELPERS
   ============================================================ */

/**
 * Updates aria-pressed + active class on all category pills.
 */
function syncCategoryButtonStates() {
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    const isActive = pill.dataset.category === filterState.category;
    pill.classList.toggle('is-active', isActive);
    pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

/**
 * Shows or hides the search clear (×) button.
 * @param {string} value - Current input value.
 */
function toggleSearchClear(value) {
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.hidden = value.trim() === '';
}

/**
 * Shows the empty-state panel and hides the grid.
 */
function showEmptyState() {
  const el = emptyState();
  if (el) el.hidden = false;
}

/**
 * Hides the empty-state panel.
 */
function hideEmptyState() {
  const el = emptyState();
  if (el) el.hidden = true;
}

/* ============================================================
   PAGINATION
   ============================================================ */

/**
 * Renders (or updates) the Load More button below the product grid.
 * Hides the button when all filtered products are already visible.
 *
 * @param {number} visibleCount - Number of products currently shown.
 * @param {number} totalCount   - Total products after filtering.
 */
function renderLoadMoreButton(visibleCount, totalCount) {
  const container = document.getElementById('loadMoreContainer');
  if (!container) return;

  const remaining = totalCount - visibleCount;

  if (remaining <= 0) {
    container.innerHTML = '';
    return;
  }

  const nextBatch = Math.min(remaining, PAGE_SIZE);

  container.innerHTML = `
    <button class="btn-load-more" id="loadMoreBtn" aria-label="Load ${nextBatch} more products">
      <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      Show ${nextBatch} more
      <span class="load-more-remaining">(${remaining} remaining)</span>
    </button>
  `;

  container.querySelector('#loadMoreBtn').addEventListener('click', () => {
    paginationState.visibleCount += PAGE_SIZE;
    applyFiltersAndSort(true); // append mode — don't re-render existing cards
  });
}

/* ============================================================
   UTILITY
   ============================================================ */

/**
 * Extracts unique, sorted category strings from the product list.
 * @param {Array} products
 * @returns {string[]}
 */
function extractCategories(products) {
  const set = new Set(products.map(p => p.category));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Title-cases a category slug for display.
 * @param {string} cat
 * @returns {string}
 */
function formatCategoryLabel(cat) {
  return cat
    .split(/[\s']+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export { initializeFilters, clearAllFilters, applyFiltersAndSort };
