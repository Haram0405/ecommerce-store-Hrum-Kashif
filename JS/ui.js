/* ============================================================
   ui.js — Skeletons, error, product modal (C), cart drawer (D)
   ============================================================ */

import { generateStars } from './products.js';
import {
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  getCartItems,
  getSubtotal,
} from './cart.js';

/* ============================================================
   SECTION A — Skeleton + Error (unchanged)
   ============================================================ */

const SKELETON_COUNT = 6;

function showSkeletons(container, count = SKELETON_COUNT) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.innerHTML = `
      <div class="skeleton-image shimmer"></div>
      <div class="skeleton-body">
        <div class="skeleton-badge shimmer"></div>
        <div class="skeleton-title-line shimmer"></div>
        <div class="skeleton-title-line shimmer"></div>
        <div class="skeleton-stars shimmer"></div>
        <div class="skeleton-footer">
          <div class="skeleton-price shimmer"></div>
          <div class="skeleton-btn shimmer"></div>
        </div>
      </div>
    `;
    container.appendChild(skeleton);
  }
}

function showError(container, message, onRetry) {
  container.innerHTML = '';
  const errorEl = document.createElement('div');
  errorEl.className = 'error-state';
  errorEl.setAttribute('role', 'alert');
  errorEl.innerHTML = `
    <i class="fa-solid fa-circle-exclamation error-state-icon" aria-hidden="true"></i>
    <p class="error-state-title">Something went wrong</p>
    <p class="error-state-message">${_escapeHtml(message)}</p>
    <button class="btn-retry" id="retryBtn" aria-label="Retry loading products">
      <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
      Try Again
    </button>
  `;
  container.appendChild(errorEl);
  errorEl.querySelector('#retryBtn').addEventListener('click', onRetry);
}

/* ============================================================
   SECTION C — Product Detail Modal (unchanged)
   ============================================================ */

let _modalPrevFocus = null;
let _modalQty       = 1;

const _modal = () => document.getElementById('productModal');

function openProductModal(product) {
  if (!product) return;
  _modalPrevFocus = document.activeElement;
  _modalQty       = 1;
  _populateModal(product);
  const dlg = _modal();
  dlg.showModal();
  dlg.querySelector('.modal-close-btn')?.focus();
}

function closeProductModal() {
  const dlg = _modal();
  if (!dlg?.open) return;

  // Play exit animation, then close once it finishes
  const ANIM_DURATION = 220; // matches modal-exit duration in CSS
  dlg.classList.add('is-closing');
  setTimeout(() => {
    dlg.classList.remove('is-closing');
    dlg.close();
    _modalPrevFocus?.focus();
    _modalQty = 1;
  }, ANIM_DURATION);
}

function setupModalEvents() {
  const dlg = _modal();
  if (!dlg) return;
  dlg.addEventListener('click', e => { if (e.target === dlg) closeProductModal(); });
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeProductModal(); });
}

function _populateModal(product) {
  const { title, description, price, category, image, rating } = product;
  const ratingValue    = rating?.rate  ?? 0;
  const ratingCount    = rating?.count ?? 0;
  const formattedPrice = `$${parseFloat(price).toFixed(2)}`;
  const dlg            = _modal();

  dlg.innerHTML = `
    <div class="modal-inner" role="document">
      <button class="modal-close-btn" aria-label="Close product details">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="modal-image-col">
        <div class="modal-image-wrap">
          <img src="${_escapeHtml(image)}" alt="${_escapeHtml(title)}"
               class="modal-image" width="420" height="420" />
        </div>
      </div>
      <div class="modal-details-col">
        <span class="modal-category">${_escapeHtml(category)}</span>
        <h2 class="modal-title" id="modalTitle">${_escapeHtml(title)}</h2>
        <div class="modal-rating" aria-label="${ratingValue} out of 5 stars, ${ratingCount} reviews">
          <span class="stars modal-stars" aria-hidden="true">${generateStars(ratingValue)}</span>
          <span class="modal-rating-text">${ratingValue} stars · ${ratingCount} reviews</span>
        </div>
        <p class="modal-description">${_escapeHtml(description)}</p>
        <div class="modal-price-row">
          <span class="modal-price">${formattedPrice}</span>
        </div>
        <div class="modal-qty-row">
          <span class="modal-qty-label">Quantity</span>
          <div class="qty-selector" role="group" aria-label="Quantity selector">
            <button class="qty-btn qty-btn--minus" id="qtyMinus" aria-label="Decrease quantity" disabled aria-disabled="true">
              <i class="fa-solid fa-minus" aria-hidden="true"></i>
            </button>
            <span class="qty-display" id="qtyDisplay" aria-live="polite" aria-atomic="true">1</span>
            <button class="qty-btn qty-btn--plus" id="qtyPlus" aria-label="Increase quantity">
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <button class="modal-add-cart-btn" id="modalAddCartBtn" aria-label="Add to cart">
          <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
          Add to Cart
        </button>
      </div>
    </div>
  `;

  _bindModalControls(product);
}

function _bindModalControls(product) {
  const dlg      = _modal();
  const minusBtn = dlg.querySelector('#qtyMinus');
  const plusBtn  = dlg.querySelector('#qtyPlus');
  const display  = dlg.querySelector('#qtyDisplay');

  dlg.querySelector('.modal-close-btn').addEventListener('click', closeProductModal);

  minusBtn.addEventListener('click', () => {
    if (_modalQty > 1) {
      _modalQty--;
      display.textContent = _modalQty;
      minusBtn.disabled = _modalQty <= 1;
      minusBtn.setAttribute('aria-disabled', String(_modalQty <= 1));
    }
  });

  plusBtn.addEventListener('click', () => {
    _modalQty++;
    display.textContent = _modalQty;
    minusBtn.disabled = false;
    minusBtn.setAttribute('aria-disabled', 'false');
  });

  dlg.querySelector('#modalAddCartBtn').addEventListener('click', () => {
    addToCart(product, _modalQty);
    closeProductModal();
  });

  _trapFocus(dlg);
}

function _trapFocus(container) {
  const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  container.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const nodes = [...container.querySelectorAll(FOCUSABLE)];
    if (!nodes.length) return;
    const first = nodes[0];
    const last  = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ============================================================
   SECTION D — Cart Drawer
   ============================================================ */

const _drawer  = () => document.getElementById('cartDrawer');
const _overlay = () => document.getElementById('cartOverlay');

/** Opens the cart drawer and dims the page. */
function openCartDrawer() {
  const drawer  = _drawer();
  const overlay = _overlay();
  if (!drawer) return;

  drawer.classList.add('cart-drawer--open');
  drawer.setAttribute('aria-hidden', 'false');
  overlay.classList.add('cart-overlay--visible');

  renderCartDrawer();

  // Focus the first focusable element in the drawer
  const firstFocusable = drawer.querySelector('button, [tabindex]:not([tabindex="-1"])');
  firstFocusable?.focus();
}

/** Closes the cart drawer. */
function closeCartDrawer() {
  const drawer  = _drawer();
  const overlay = _overlay();
  if (!drawer) return;

  drawer.classList.remove('cart-drawer--open');
  drawer.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('cart-overlay--visible');

  // Restore focus to the cart toggle button
  document.getElementById('cartToggle')?.focus();
}

/**
 * Fully re-renders the cart drawer contents.
 * Called after every cart mutation.
 */
function renderCartDrawer() {
  const drawer = _drawer();
  if (!drawer) return;

  const items    = getCartItems();
  const subtotal = getSubtotal();

  drawer.innerHTML = items.length === 0
    ? _renderEmptyCart()
    : _renderFilledCart(items, subtotal);

  _bindDrawerEvents(items);
}

/** Returns HTML for the empty cart state. */
function _renderEmptyCart() {
  return `
    <div class="drawer-header">
      <h2 class="drawer-title">
        <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
        Your Cart
      </h2>
      <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close cart">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
    <div class="drawer-empty">
      <i class="fa-solid fa-bag-shopping drawer-empty-icon" aria-hidden="true"></i>
      <p class="drawer-empty-title">Your cart is empty</p>
      <p class="drawer-empty-msg">Add some products and they'll appear here.</p>
      <button class="btn-continue-shopping" id="continueShoppingBtn">
        Continue Shopping
      </button>
    </div>
  `;
}

/**
 * Returns HTML for the filled cart state.
 * @param {Array}  items
 * @param {string} subtotal
 */
function _renderFilledCart(items, subtotal) {
  const itemsHtml = items.map(_renderCartItem).join('');

  return `
    <div class="drawer-header">
      <h2 class="drawer-title">
        <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
        Your Cart
        <span class="drawer-item-count">(${items.reduce((s, i) => s + i.quantity, 0)})</span>
      </h2>
      <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close cart">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>

    <ul class="drawer-items" aria-label="Cart items">
      ${itemsHtml}
    </ul>

    <div class="drawer-footer">
      <div class="drawer-subtotal-row">
        <span class="drawer-subtotal-label">Subtotal</span>
        <span class="drawer-subtotal-value" id="drawerSubtotal">${subtotal}</span>
      </div>
      <p class="drawer-shipping-note">Shipping &amp; taxes calculated at checkout</p>
      <button class="btn-checkout" id="checkoutBtn">
        <i class="fa-solid fa-lock" aria-hidden="true"></i>
        Proceed to Checkout
      </button>
    </div>
  `;
}

/**
 * Returns HTML for a single cart line item.
 * @param {{ product: Object, quantity: number }} item
 * @returns {string}
 */
function _renderCartItem({ product, quantity }) {
  const { id, title, price, image } = product;
  const lineTotal  = `$${(price * quantity).toFixed(2)}`;
  const unitPrice  = `$${parseFloat(price).toFixed(2)}`;

  return `
    <li class="drawer-item" data-id="${id}">
      <div class="drawer-item-img-wrap">
        <img src="${_escapeHtml(image)}" alt="${_escapeHtml(title)}"
             class="drawer-item-img" width="64" height="64" loading="lazy" />
      </div>
      <div class="drawer-item-info">
        <p class="drawer-item-title">${_escapeHtml(title)}</p>
        <p class="drawer-item-unit-price">${unitPrice} each</p>
        <div class="drawer-item-controls">
          <div class="drawer-qty-selector" role="group" aria-label="Quantity for ${_escapeHtml(title)}">
            <button
              class="drawer-qty-btn drawer-qty-minus"
              data-id="${id}"
              aria-label="Decrease quantity"
              ${quantity <= 1 ? 'disabled aria-disabled="true"' : ''}
            >
              <i class="fa-solid fa-minus" aria-hidden="true"></i>
            </button>
            <span class="drawer-qty-display" aria-live="polite">${quantity}</span>
            <button
              class="drawer-qty-btn drawer-qty-plus"
              data-id="${id}"
              aria-label="Increase quantity"
            >
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>
          </div>
          <span class="drawer-item-line-total">${lineTotal}</span>
          <button
            class="drawer-remove-btn"
            data-id="${id}"
            aria-label="Remove ${_escapeHtml(title)} from cart"
          >
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </li>
  `;
}

/**
 * Attaches all event listeners inside the rendered drawer.
 * Uses event delegation on the drawer root.
 */
function _bindDrawerEvents(items) {
  const drawer = _drawer();

  // Close button
  drawer.querySelector('#drawerCloseBtn')?.addEventListener('click', closeCartDrawer);

  // Continue shopping (empty state)
  drawer.querySelector('#continueShoppingBtn')?.addEventListener('click', closeCartDrawer);

  // Checkout
  drawer.querySelector('#checkoutBtn')?.addEventListener('click', openCheckoutModal);

  // Inject stagger index for slide-in animation on each drawer item
  drawer.querySelectorAll('.drawer-item').forEach((el, i) => {
    el.style.setProperty('--item-index', i);
  });

  // Quantity + / - and remove via delegation
  drawer.querySelector('.drawer-items')?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    const productId = parseInt(btn.dataset.id, 10);

    if (btn.classList.contains('drawer-qty-minus')) {
      decreaseQuantity(productId);
    } else if (btn.classList.contains('drawer-qty-plus')) {
      increaseQuantity(productId);
    } else if (btn.classList.contains('drawer-remove-btn')) {
      removeFromCart(productId);
    }

    renderCartDrawer();
  });
}

/* ============================================================
   SECTION D — Order Confirmation Modal
   ============================================================ */

/**
 * Opens a confirmation modal listing all cart items + total,
 * then clears the cart on confirm.
 */
function openCheckoutModal() {
  const items    = getCartItems();
  const subtotal = getSubtotal();

  // Remove any stale checkout modal
  document.getElementById('checkoutModal')?.remove();

  const modal = document.createElement('dialog');
  modal.id        = 'checkoutModal';
  modal.className = 'checkout-modal';

  const itemsHtml = items.map(({ product, quantity }) => `
    <li class="confirm-item">
      <img src="${_escapeHtml(product.image)}" alt="${_escapeHtml(product.title)}"
           class="confirm-item-img" width="48" height="48" loading="lazy" />
      <div class="confirm-item-info">
        <p class="confirm-item-title">${_escapeHtml(product.title)}</p>
        <p class="confirm-item-meta">
          ${quantity} × $${parseFloat(product.price).toFixed(2)}
        </p>
      </div>
      <span class="confirm-item-total">
        $${(product.price * quantity).toFixed(2)}
      </span>
    </li>
  `).join('');

  modal.innerHTML = `
    <div class="checkout-modal-inner" role="document">
      <button class="modal-close-btn" id="checkoutCloseBtn" aria-label="Close order confirmation">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="checkout-modal-header">
        <i class="fa-solid fa-bag-shopping checkout-modal-icon" aria-hidden="true"></i>
        <h2 class="checkout-modal-title">Order Summary</h2>
        <p class="checkout-modal-sub">Review your items before confirming</p>
      </div>
      <ul class="confirm-items" aria-label="Order items">
        ${itemsHtml}
      </ul>
      <div class="confirm-total-row">
        <span class="confirm-total-label">Total</span>
        <span class="confirm-total-value">${subtotal}</span>
      </div>
      <div class="confirm-actions">
        <button class="btn-confirm-cancel" id="confirmCancelBtn">Go Back</button>
        <button class="btn-confirm-order" id="confirmOrderBtn">
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          Confirm Order
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.showModal();

  // Animated close helper — plays exit anim then calls native dialog.close()
  const CHECKOUT_ANIM = 220; // matches checkout-exit duration in CSS
  const _closeCheckout = () => {
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.classList.remove('is-closing');
      modal.close();
    }, CHECKOUT_ANIM);
  };

  // Close (X) and Go Back
  modal.querySelector('#checkoutCloseBtn').addEventListener('click', _closeCheckout);
  modal.querySelector('#confirmCancelBtn').addEventListener('click', _closeCheckout);

  // Backdrop click
  modal.addEventListener('click', e => { if (e.target === modal) _closeCheckout(); });

  // Escape
  modal.addEventListener('cancel', e => { e.preventDefault(); _closeCheckout(); });

  // Clean up from DOM after close animation
  modal.addEventListener('close', () => modal.remove());

  // Confirm order → clear cart, close everything, show success toast
  modal.querySelector('#confirmOrderBtn').addEventListener('click', () => {
    _closeCheckout();
    setTimeout(() => {
      clearCart();
      closeCartDrawer();
      renderCartDrawer();
      _showOrderSuccessToast();
    }, CHECKOUT_ANIM);
  });

  _trapFocus(modal);
  modal.querySelector('#checkoutCloseBtn')?.focus();
}

/** Toasts a brief order success message. */
function _showOrderSuccessToast() {
  const existing = document.getElementById('cartToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id        = 'cartToast';
  toast.className = 'cart-toast cart-toast--success';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check cart-toast-icon" aria-hidden="true"></i>
    <span class="cart-toast-text"><strong>Order confirmed!</strong> Thank you for shopping with us.</span>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('cart-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('cart-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ============================================================
   SECTION E — Dark Mode Persistence
   ============================================================ */

const THEME_KEY    = 'storefront_theme_v1';
const DARK_CLASS   = 'dark-mode';
const ICON_DARK    = 'fa-moon';
const ICON_LIGHT   = 'fa-sun';

/**
 * Saves the current theme preference to localStorage.
 * @param {'dark'|'light'} theme
 */
function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Reads theme from localStorage, applies it to <body>, syncs the toggle
 * icon, and wires the toggle button click handler.
 * Called once at app startup — before first paint to avoid flash.
 */
function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);

  // Honour stored preference; fall back to OS preference; default light.
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark      = stored ? stored === 'dark' : prefersDark;

  _applyTheme(isDark);

  // Wire the toggle button (exists in HTML from Section A)
  document.getElementById('darkModeToggle')
    ?.addEventListener('click', _toggleTheme);
}

/**
 * Toggles dark ↔ light, persists the new value, and updates the icon.
 */
function _toggleTheme() {
  const isDark = document.body.classList.toggle(DARK_CLASS);
  _syncToggleIcon(isDark);
  saveTheme(isDark ? 'dark' : 'light');
}

/**
 * Applies the theme class to <body> and syncs the icon.
 * @param {boolean} isDark
 */
function _applyTheme(isDark) {
  document.body.classList.toggle(DARK_CLASS, isDark);
  _syncToggleIcon(isDark);
}

/**
 * Swaps the moon/sun icon on the dark-mode toggle button.
 * @param {boolean} isDark
 */
function _syncToggleIcon(isDark) {
  const btn  = document.getElementById('darkModeToggle');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  // fa-regular fa-moon  →  fa-solid fa-sun (and back)
  icon.classList.toggle('fa-regular', !isDark);
  icon.classList.toggle('fa-solid',   isDark);
  icon.classList.toggle(ICON_DARK,    !isDark);
  icon.classList.toggle(ICON_LIGHT,   isDark);
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

/* ============================================================
   UTILITY (private)
   ============================================================ */

function _escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

/* ============================================================
   SECTION G — Mobile Navigation (Hamburger)
   ============================================================ */

/**
 * Initialises the hamburger menu: wires open/close triggers,
 * overlay click, Escape key, and focus-trapping inside the nav drawer.
 * Called once from app.js on startup.
 */
function initMobileNav() {
  const hamburger = document.getElementById('hamburgerBtn');
  const nav       = document.getElementById('mobileNav');
  const overlay   = document.getElementById('mobileNavOverlay');
  const closeBtn  = document.getElementById('mobileNavClose');

  if (!hamburger || !nav) return;

  hamburger.addEventListener('click', openMobileNav);
  closeBtn?.addEventListener('click', closeMobileNav);
  overlay?.addEventListener('click', closeMobileNav);

  // Close on any nav link click (single-page feel)
  nav.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // Escape key closes the nav (only when it is open)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('mobile-nav--open')) {
      closeMobileNav();
    }
  });

  // Close nav automatically when viewport widens past mobile breakpoint
  const mql = window.matchMedia('(min-width: 768px)');
  mql.addEventListener('change', e => { if (e.matches) closeMobileNav(); });
}

/** Opens the mobile navigation drawer. */
function openMobileNav() {
  const hamburger = document.getElementById('hamburgerBtn');
  const nav       = document.getElementById('mobileNav');
  const overlay   = document.getElementById('mobileNavOverlay');

  nav.classList.add('mobile-nav--open');
  nav.setAttribute('aria-hidden', 'false');
  overlay.classList.add('mobile-nav-overlay--visible');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.classList.add('nav-open');

  // Move focus to the close button inside the drawer
  document.getElementById('mobileNavClose')?.focus();
}

/** Closes the mobile navigation drawer and restores focus. */
function closeMobileNav() {
  const hamburger = document.getElementById('hamburgerBtn');
  const nav       = document.getElementById('mobileNav');
  const overlay   = document.getElementById('mobileNavOverlay');

  nav.classList.remove('mobile-nav--open');
  nav.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('mobile-nav-overlay--visible');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');

  hamburger.focus();
}

export {
  showSkeletons,
  showError,
  openProductModal,
  closeProductModal,
  setupModalEvents,
  openCartDrawer,
  closeCartDrawer,
  renderCartDrawer,
  openCheckoutModal,
  saveTheme,
  loadTheme,
  initMobileNav,
};
