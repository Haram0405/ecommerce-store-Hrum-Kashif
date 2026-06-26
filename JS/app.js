/* ============================================================
   app.js — Application entry point
   Section A: fetch → skeleton → render / error
   Section B: initialise filters after successful fetch
   Section C: setup product modal events
   Section D: initialise cart, wire cart drawer toggle
   Section E: restore persisted theme and cart on startup
   Section G: initialise responsive mobile navigation
   ============================================================ */

import { fetchProducts }                            from './api.js';
import { renderProducts, updateProductCount }       from './products.js';
import { showSkeletons, showError, setupModalEvents,
         openCartDrawer, closeCartDrawer,
         loadTheme, initMobileNav }                from './ui.js';
import { initializeFilters, clearAllFilters }       from './filters.js';
import { loadCart }                                 from './cart.js';
import { initWishlist }                             from './wishlist.js';
import { initCompare }                              from './compare.js';

const productGrid = document.getElementById('productGrid');

/* ============================================================
   PRODUCT LOADING (Section A)
   ============================================================ */

async function loadProducts() {
  showSkeletons(productGrid);
  updateProductCount(0);

  try {
    const products = await fetchProducts();

    // Section B: filter pipeline owns rendering
    initializeFilters(products);

    // Section B: wire inline empty-state clear link
    document.getElementById('emptyStateClear')
      ?.addEventListener('click', clearAllFilters);

  } catch (error) {
    console.error('[Storefront] Failed to load products:', error);

    showError(
      productGrid,
      error.message || 'Unable to load products. Please check your connection.',
      loadProducts
    );

    updateProductCount(0);
  }
}

/* ============================================================
   CART DRAWER (Section D)
   ============================================================ */

function initCart() {
  // Rehydrate cart from localStorage before anything renders
  loadCart();

  // Cart icon in header → open drawer
  document.getElementById('cartToggle')
    ?.addEventListener('click', openCartDrawer);

  // Dimmed overlay → close drawer
  document.getElementById('cartOverlay')
    ?.addEventListener('click', closeCartDrawer);

  // Escape key while drawer is open → close drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('cartDrawer');
      if (drawer?.classList.contains('cart-drawer--open')) {
        e.preventDefault();
        closeCartDrawer();
      }
    }
  });
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */

function init() {
  loadTheme();         // Section E — restore dark/light preference (before first paint)
  setupModalEvents();  // Section C — product modal backdrop/Escape
  initCart();          // Section D/E — load persisted cart, wire toggle
  initMobileNav();     // Section G — hamburger menu
  initWishlist();      // Bonus — load persisted wishlist, wire panel toggle
  initCompare();       // Bonus — bootstrap comparison feature
  loadProducts();      // Section A/B — fetch, skeleton, filter
}

document.addEventListener('DOMContentLoaded', init);
