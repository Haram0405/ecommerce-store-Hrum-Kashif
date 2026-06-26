/* ============================================================
   wishlist.js — Wishlist state, persistence, and panel UI
   ============================================================ */

/* ---------- Constants ---------- */
const STORAGE_KEY  = 'storefront_wishlist_v1';

/* ---------- State ---------- */
let _wishlist = new Set(); // Set of product IDs (numbers)

/* ============================================================
   PERSISTENCE
   ============================================================ */

/**
 * Loads wishlist from localStorage and populates the in-memory Set.
 * Called once at app startup.
 */
function loadWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw);
    if (Array.isArray(ids)) {
      _wishlist = new Set(ids.map(Number));
    }
  } catch {
    _wishlist = new Set();
  }
}

/**
 * Persists the current wishlist Set to localStorage.
 */
function saveWishlist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([..._wishlist]));
  } catch {
    // Silently ignore storage quota errors
  }
}

/* ============================================================
   STATE MUTATIONS
   ============================================================ */

/**
 * Toggles a product in/out of the wishlist.
 * Persists the change and updates all wishlist button states on the page.
 *
 * @param {number} productId
 * @returns {boolean} true if the product is now wishlisted.
 */
function toggleWishlist(productId) {
  const id = Number(productId);
  if (_wishlist.has(id)) {
    _wishlist.delete(id);
  } else {
    _wishlist.add(id);
  }
  saveWishlist();
  _syncAllWishlistButtons(id);
  updateWishlistBadge();
  return _wishlist.has(id);
}

/**
 * Returns whether a product is currently in the wishlist.
 * @param {number} productId
 * @returns {boolean}
 */
function isWishlisted(productId) {
  return _wishlist.has(Number(productId));
}

/**
 * Returns the current wishlist Set (read-only snapshot).
 * @returns {Set<number>}
 */
function getWishlistIds() {
  return new Set(_wishlist);
}

/**
 * Returns the total number of wishlisted products.
 * @returns {number}
 */
function getWishlistCount() {
  return _wishlist.size;
}

/* ============================================================
   HEADER BADGE
   ============================================================ */

/**
 * Syncs the heart badge count in the header.
 */
function updateWishlistBadge() {
  const badge = document.getElementById('wishlistBadge');
  if (!badge) return;
  const count = _wishlist.size;
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden      = count === 0;
}

/* ============================================================
   WISHLIST PANEL
   ============================================================ */

/**
 * Opens the wishlist panel drawer.
 */
function openWishlistPanel() {
  const panel   = document.getElementById('wishlistPanel');
  const overlay = document.getElementById('wishlistOverlay');
  if (!panel) return;

  _renderWishlistPanel(panel);

  panel.classList.add('wishlist-panel--open');
  panel.setAttribute('aria-hidden', 'false');
  overlay?.classList.add('wishlist-overlay--visible');
  document.body.classList.add('wishlist-open');

  panel.querySelector('.wishlist-close-btn')?.focus();
}

/**
 * Closes the wishlist panel drawer.
 */
function closeWishlistPanel() {
  const panel   = document.getElementById('wishlistPanel');
  const overlay = document.getElementById('wishlistOverlay');
  if (!panel) return;

  panel.classList.remove('wishlist-panel--open');
  panel.setAttribute('aria-hidden', 'true');
  overlay?.classList.remove('wishlist-overlay--visible');
  document.body.classList.remove('wishlist-open');

  document.getElementById('wishlistToggle')?.focus();
}

/**
 * Builds the wishlist panel content from the product cache.
 * Pulls product data from the shared module-level cache in products.js
 * via a dynamic import to avoid circular dependencies.
 *
 * @param {HTMLElement} panel
 */
function _renderWishlistPanel(panel) {
  const ids = [..._wishlist];

  if (ids.length === 0) {
    panel.innerHTML = _emptyPanelHtml();
    _wireCloseButton(panel);
    return;
  }

  // Resolve product objects from the cache via products.js
  import('./products.js').then(({ getProductById }) => {
    const products = ids
      .map(id => getProductById(id))
      .filter(Boolean); // filter out any ids not yet in cache

    if (products.length === 0) {
      panel.innerHTML = _emptyPanelHtml();
      _wireCloseButton(panel);
      return;
    }

    const itemsHtml = products.map(p => {
      const price = `$${parseFloat(p.price).toFixed(2)}`;
      return `
        <li class="wishlist-item" data-id="${p.id}">
          <div class="wishlist-item-img-wrap">
            <img src="${_escape(p.image)}" alt="${_escape(p.title)}"
                 class="wishlist-item-img" width="72" height="72" loading="lazy" />
          </div>
          <div class="wishlist-item-info">
            <p class="wishlist-item-title">${_escape(p.title)}</p>
            <p class="wishlist-item-price">${price}</p>
          </div>
          <div class="wishlist-item-actions">
            <button class="wishlist-item-cart-btn" data-id="${p.id}"
                    aria-label="Add ${_escape(p.title)} to cart">
              <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
            </button>
            <button class="wishlist-item-remove-btn" data-id="${p.id}"
                    aria-label="Remove ${_escape(p.title)} from wishlist">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="wishlist-header">
        <span class="wishlist-title">
          <i class="fa-solid fa-heart" aria-hidden="true"></i>
          Wishlist
          <span class="wishlist-header-count">(${products.length})</span>
        </span>
        <button class="wishlist-close-btn icon-btn" aria-label="Close wishlist">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <ul class="wishlist-items" aria-label="Wishlisted products">
        ${itemsHtml}
      </ul>
      <div class="wishlist-footer">
        <button class="wishlist-clear-btn" id="wishlistClearBtn">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          Clear all
        </button>
      </div>
    `;

    _wireCloseButton(panel);
    _wireItemButtons(panel, products);
  });
}

function _emptyPanelHtml() {
  return `
    <div class="wishlist-header">
      <span class="wishlist-title">
        <i class="fa-solid fa-heart" aria-hidden="true"></i>
        Wishlist
      </span>
      <button class="wishlist-close-btn icon-btn" aria-label="Close wishlist">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
    <div class="wishlist-empty">
      <i class="fa-regular fa-heart wishlist-empty-icon" aria-hidden="true"></i>
      <p class="wishlist-empty-title">Your wishlist is empty</p>
      <p class="wishlist-empty-msg">Click the heart on any product to save it here.</p>
      <button class="wishlist-continue-btn" id="wishlistContinueBtn">
        Continue Shopping
      </button>
    </div>
  `;
}

function _wireCloseButton(panel) {
  panel.querySelector('.wishlist-close-btn')
    ?.addEventListener('click', closeWishlistPanel);
  panel.querySelector('#wishlistContinueBtn')
    ?.addEventListener('click', closeWishlistPanel);
}

function _wireItemButtons(panel, products) {
  // Remove from wishlist
  panel.querySelectorAll('.wishlist-item-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      toggleWishlist(id);       // removes and syncs
      openWishlistPanel();      // re-render
    });
  });

  // Add to cart from wishlist
  panel.querySelectorAll('.wishlist-item-cart-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id      = Number(btn.dataset.id);
      const product = products.find(p => p.id === id);
      if (!product) return;
      import('./cart.js').then(({ addToCart }) => addToCart(product, 1));
    });
  });

  // Clear all
  panel.querySelector('#wishlistClearBtn')?.addEventListener('click', () => {
    _wishlist.clear();
    saveWishlist();
    updateWishlistBadge();
    _syncAllWishlistButtons();
    openWishlistPanel(); // re-render empty state
  });
}

/* ============================================================
   BUTTON SYNC HELPERS
   ============================================================ */

/**
 * Updates every .wishlist-btn on the page to reflect the current
 * wishlist state. Optionally targets only buttons for a specific id.
 *
 * @param {number} [id] - If provided, only sync buttons for this product.
 */
function _syncAllWishlistButtons(id) {
  const selector = id
    ? `.wishlist-btn[data-product-id="${id}"]`
    : '.wishlist-btn';

  document.querySelectorAll(selector).forEach(btn => {
    const btnId    = Number(btn.dataset.productId);
    const active   = _wishlist.has(btnId);
    const icon     = btn.querySelector('i');
    btn.classList.toggle('wishlist-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute('aria-label',
      active ? btn.dataset.titleRemove : btn.dataset.titleAdd);
    if (icon) {
      icon.classList.toggle('fa-solid',  active);
      icon.classList.toggle('fa-regular', !active);
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */

/**
 * Bootstraps wishlist: loads from storage, syncs badge, wires header
 * toggle and overlay close. Called once from app.js on startup.
 */
function initWishlist() {
  loadWishlist();
  updateWishlistBadge();

  document.getElementById('wishlistToggle')
    ?.addEventListener('click', openWishlistPanel);

  document.getElementById('wishlistOverlay')
    ?.addEventListener('click', closeWishlistPanel);

  document.addEventListener('keydown', e => {
    const panel = document.getElementById('wishlistPanel');
    if (e.key === 'Escape' && panel?.classList.contains('wishlist-panel--open')) {
      closeWishlistPanel();
    }
  });
}

/* ============================================================
   UTILITY
   ============================================================ */

function _escape(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

export {
  initWishlist,
  loadWishlist,
  toggleWishlist,
  isWishlisted,
  getWishlistIds,
  getWishlistCount,
  updateWishlistBadge,
  openWishlistPanel,
  closeWishlistPanel,
};
