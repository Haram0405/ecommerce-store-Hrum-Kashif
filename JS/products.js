/* ============================================================
   products.js — Card creation, rendering, star ratings, count
   Section C: card clicks now open the product modal via ui.js
   ============================================================ */

/* --- Module-level product cache for modal lookups --- */
let _productCache = new Map(); // id → product object

/**
 * Generates Font Awesome star icons for a given rating.
 * Supports full stars, half stars, and empty stars up to 5.
 *
 * @param {number} rating - Numeric rating (0–5).
 * @returns {string} HTML string of <i> star elements.
 */
function generateStars(rating) {
  const MAX_STARS  = 5;
  const fullStars  = Math.floor(rating);
  const hasHalf    = rating - fullStars >= 0.5;
  const emptyStars = MAX_STARS - fullStars - (hasHalf ? 1 : 0);

  let html = '';

  for (let i = 0; i < fullStars; i++) {
    html += '<i class="fa-solid fa-star" aria-hidden="true"></i>';
  }

  if (hasHalf) {
    html += '<i class="fa-solid fa-star-half-stroke" aria-hidden="true"></i>';
  }

  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="fa-regular fa-star empty" aria-hidden="true"></i>';
  }

  return html;
}

/**
 * Creates a single product card DOM element.
 *
 * @param {Object} product - Product data from the API.
 * @returns {HTMLElement} The fully constructed card element.
 */
function createProductCard(product) {
  const { id, title, price, category, image, rating } = product;

  // Keep the cache fresh for modal lookups
  _productCache.set(id, product);

  const card = document.createElement('article');
  card.className = 'product-card';
  card.setAttribute('data-product-id', id);
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${title}`);

  const formattedPrice = `$${parseFloat(price).toFixed(2)}`;
  const ratingValue    = rating?.rate  ?? 0;
  const ratingCount    = rating?.count ?? 0;
  const starsHtml      = generateStars(ratingValue);
  const ratingLabel    = `${ratingValue} out of 5 stars, ${ratingCount} reviews`;

  card.innerHTML = `
    <div class="card-image-wrap">
      <img
        src="${image}"
        alt="${escapeHtml(title)}"
        loading="lazy"
        width="260"
        height="260"
      />
      <span class="card-category">${escapeHtml(category)}</span>
      <button
        class="wishlist-btn"
        data-product-id="${id}"
        data-title-add="Save ${escapeHtml(title)} to wishlist"
        data-title-remove="Remove ${escapeHtml(title)} from wishlist"
        aria-label="Save ${escapeHtml(title)} to wishlist"
        aria-pressed="false"
      >
        <i class="fa-regular fa-heart" aria-hidden="true"></i>
      </button>
    </div>

    <div class="card-body">
      <h2 class="card-title">${escapeHtml(title)}</h2>

      <div class="card-rating" aria-label="${ratingLabel}">
        <span class="stars" aria-hidden="true">${starsHtml}</span>
        <span class="rating-count">(${ratingCount})</span>
      </div>

      <div class="card-footer">
        <span class="card-price">${formattedPrice}</span>
        <button
          class="btn-add-cart"
          data-product-id="${id}"
          aria-label="Add ${escapeHtml(title)} to cart"
        >
          <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
          Add to Cart
        </button>
      </div>

      <button
        class="compare-btn"
        data-product-id="${id}"
        data-title="${escapeHtml(title)}"
        aria-label="Add ${escapeHtml(title)} to comparison"
        aria-pressed="false"
      >
        <i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
        <span>Compare</span>
      </button>
    </div>
  `;

  // Card body click → open modal (Section C)
  card.addEventListener('click', _handleCardClick);
  card.addEventListener('keydown', _handleCardKeydown);

  // Add to Cart button: adds qty=1 directly, must NOT open modal
  const cartBtn = card.querySelector('.btn-add-cart');
  cartBtn.addEventListener('click', _handleAddToCart);

  // Heart button: toggle wishlist, must NOT open modal
  const wishlistBtn = card.querySelector('.wishlist-btn');
  wishlistBtn.addEventListener('click', _handleWishlistToggle);

  // Compare button: toggle comparison, must NOT open modal
  const compareBtn = card.querySelector('.compare-btn');
  compareBtn.addEventListener('click', _handleCompareToggle);

  return card;
}

/**
 * Handles a card click — opens the product modal.
 * Ignores clicks that originate on the Add to Cart button.
 *
 * @this {HTMLElement} The card element.
 * @param {MouseEvent} event
 */
function _handleCardClick(event) {
  if (event.target.closest('.btn-add-cart')) return;
  if (event.target.closest('.wishlist-btn'))  return;
  if (event.target.closest('.compare-btn'))   return;

  const productId = Number(this.dataset.productId);
  const product   = _productCache.get(productId);
  if (!product) return;

  // Dynamically import to avoid a circular reference at module parse time.
  // ui.js imports from products.js (generateStars), so products.js
  // must not import from ui.js at the top level.
  import('./ui.js').then(({ openProductModal }) => openProductModal(product));
}

/**
 * Keyboard accessibility: trigger card click on Enter / Space.
 * @param {KeyboardEvent} event
 */
function _handleCardKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    this.click();
  }
}

/**
 * Handles the Add to Cart button click.
 * Adds qty=1 immediately and stops the event from bubbling to the card.
 *
 * @param {MouseEvent} event
 */
function _handleAddToCart(event) {
  event.stopPropagation(); // do NOT open modal

  const productId = Number(event.currentTarget.dataset.productId);
  const product   = _productCache.get(productId);
  if (!product) return;

  import('./cart.js').then(({ addToCart }) => addToCart(product, 1));
}

/**
 * Handles the heart/wishlist button click.
 * Toggles the product in the wishlist; does NOT open the modal.
 *
 * @param {MouseEvent} event
 */
function _handleWishlistToggle(event) {
  event.stopPropagation();

  const productId = Number(event.currentTarget.dataset.productId);
  import('./wishlist.js').then(({ toggleWishlist, isWishlisted }) => {
    toggleWishlist(productId);
  });
}

/**
 * Handles the Compare button click.
 * Toggles the product in the comparison set; does NOT open the modal.
 *
 * @param {MouseEvent} event
 */
function _handleCompareToggle(event) {
  event.stopPropagation();
  const productId = Number(event.currentTarget.dataset.productId);
  import('./compare.js').then(({ toggleCompare }) => toggleCompare(productId));
}

/**
 * Renders a list of products into the grid container.
 *
 * @param {Array}       products       - Array of product objects to render.
 * @param {HTMLElement} container      - The grid element to render into.
 * @param {boolean}     [append=false] - Append to existing cards instead of replacing.
 */
function renderProducts(products, container, append = false) {
  if (!append) {
    container.innerHTML = '';
  }

  if (!products || products.length === 0) {
    if (!append) updateProductCount(0);
    return;
  }

  // Stagger offset: new cards continue the index from existing ones so the
  // animation delay doesn't restart from 0 when more are appended.
  const existingCount = append ? container.querySelectorAll('.product-card').length : 0;

  const fragment = document.createDocumentFragment();
  products.forEach((product, index) => {
    const card = createProductCard(product);
    card.style.setProperty('--card-index', existingCount + index);
    fragment.appendChild(card);
  });
  container.appendChild(fragment);

  // Sync heart button states with persisted wishlist (dynamic to avoid circular import)
  import('./wishlist.js').then(({ isWishlisted }) => {
    container.querySelectorAll('.wishlist-btn').forEach(btn => {
      const id     = Number(btn.dataset.productId);
      const active = isWishlisted(id);
      const icon   = btn.querySelector('i');
      btn.classList.toggle('wishlist-btn--active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label',
        active ? btn.dataset.titleRemove : btn.dataset.titleAdd);
      if (icon) {
        icon.classList.toggle('fa-solid',  active);
        icon.classList.toggle('fa-regular', !active);
      }
    });
  });

  // Sync compare button states with current comparison set
  import('./compare.js').then(({ isInCompare }) => {
    container.querySelectorAll('.compare-btn').forEach(btn => {
      const id     = Number(btn.dataset.productId);
      const active = isInCompare(id);
      const span   = btn.querySelector('span');
      btn.classList.toggle('compare-btn--active', active);
      btn.setAttribute('aria-pressed', String(active));
      if (span) span.textContent = active ? 'Added' : 'Compare';
    });
  });
}

/**
 * Updates the "Showing N products" counter in the toolbar.
 * @param {number} count
 */
function updateProductCount(count) {
  const countEl = document.getElementById('productCount');
  if (!countEl) return;

  if (count === 0) {
    countEl.textContent = 'No products to show';
    return;
  }

  countEl.innerHTML = `Showing <strong>${count}</strong> product${count !== 1 ? 's' : ''}`;
}

/**
 * Simple HTML escape to prevent XSS when inserting API strings.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Returns a product object from the in-memory cache by numeric ID.
 * Used by wishlist.js to resolve product data without circular imports.
 *
 * @param {number} id
 * @returns {Object|undefined}
 */
function getProductById(id) {
  return _productCache.get(Number(id));
}

export { renderProducts, createProductCard, generateStars, updateProductCount, getProductById };
