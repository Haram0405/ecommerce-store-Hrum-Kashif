/* ============================================================
   cart.js — Full cart state, persistence, and badge (Section D)
   ============================================================ */

const STORAGE_KEY = 'storefront_cart_v1';

/* ---------- State ---------- */
let cartItems = []; // Array of { product, quantity }

/* ============================================================
   PERSISTENCE
   ============================================================ */

/**
 * Serialises cartItems to localStorage.
 * Only stores the product fields needed to avoid stale API data issues.
 */
function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
}

/**
 * Rehydrates cartItems from localStorage.
 * Called once at app init.
 */
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cartItems = raw ? JSON.parse(raw) : [];
  } catch {
    cartItems = [];
  }
  updateCartBadge();
}

/* ============================================================
   CART OPERATIONS
   ============================================================ */

/**
 * Adds a product to the cart at the given quantity.
 * Increments quantity if the product already exists.
 *
 * @param {Object} product  - Full product object from the API.
 * @param {number} quantity - Units to add (default 1).
 */
function addToCart(product, quantity = 1) {
  if (!product?.id) return;

  const existing = cartItems.find(item => item.product.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cartItems.push({ product, quantity });
  }

  saveCart();
  updateCartBadge();
  _showAddedFeedback(product, quantity);

  // Re-render drawer if it is currently open
  import('./ui.js').then(({ renderCartDrawer }) => renderCartDrawer());
}

/**
 * Removes a product entirely from the cart by product ID.
 * @param {number} productId
 */
function removeFromCart(productId) {
  cartItems = cartItems.filter(item => item.product.id !== productId);
  saveCart();
  updateCartBadge();
}

/**
 * Increases quantity of a cart item by 1.
 * @param {number} productId
 */
function increaseQuantity(productId) {
  const item = cartItems.find(i => i.product.id === productId);
  if (item) {
    item.quantity += 1;
    saveCart();
    updateCartBadge();
  }
}

/**
 * Decreases quantity of a cart item by 1.
 * Quantity floor is 1 — never goes below, never auto-removes.
 * @param {number} productId
 */
function decreaseQuantity(productId) {
  const item = cartItems.find(i => i.product.id === productId);
  if (item && item.quantity > 1) {
    item.quantity -= 1;
    saveCart();
    updateCartBadge();
  }
}

/**
 * Clears all items from the cart.
 */
function clearCart() {
  cartItems = [];
  saveCart();
  updateCartBadge();
}

/* ============================================================
   COMPUTED VALUES
   ============================================================ */

/**
 * Returns the total number of individual units in the cart.
 * @returns {number}
 */
function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Returns the cart subtotal as a formatted USD string.
 * @returns {string}  e.g. "$124.99"
 */
function getSubtotal() {
  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  return `$${total.toFixed(2)}`;
}

/**
 * Returns a shallow copy of cartItems for read-only consumption.
 * @returns {Array}
 */
function getCartItems() {
  return [...cartItems];
}

/* ============================================================
   BADGE
   ============================================================ */

/**
 * Syncs the header cart badge to the current item count.
 */
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
}

/* ============================================================
   TOAST FEEDBACK (kept from Section C)
   ============================================================ */

/**
 * Shows a brief non-blocking toast when an item is added.
 * @param {Object} product
 * @param {number} quantity
 */
function _showAddedFeedback(product, quantity) {
  const existing = document.getElementById('cartToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id        = 'cartToast';
  toast.className = 'cart-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML = `
    <i class="fa-solid fa-circle-check cart-toast-icon" aria-hidden="true"></i>
    <span class="cart-toast-text">
      <strong>${quantity > 1 ? `${quantity}×` : ''} ${_truncate(product.title, 40)}</strong>
      added to cart
    </span>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('cart-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('cart-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2400);
}

/* ============================================================
   PRIVATE UTILITY
   ============================================================ */

/**
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function _truncate(str, maxLen) {
  return str.length > maxLen ? `${str.slice(0, maxLen).trimEnd()}…` : str;
}

export {
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  getCartCount,
  getSubtotal,
  getCartItems,
  saveCart,
  loadCart,
  updateCartBadge,
};
