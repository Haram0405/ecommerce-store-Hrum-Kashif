/* ============================================================
   compare.js — Product comparison: state, modal, tray, button sync
   ============================================================ */

const MAX_COMPARE = 3;
let _compareSet = new Set(); // Set of numeric product IDs

/* ============================================================
   STATE MUTATIONS
   ============================================================ */

function toggleCompare(productId) {
  const id = Number(productId);

  if (_compareSet.has(id)) {
    _compareSet.delete(id);
  } else {
    if (_compareSet.size >= MAX_COMPARE) {
      _showCapToast();
      return false;
    }
    _compareSet.add(id);
  }

  _syncAllCompareButtons(id);
  _syncCompareTray();
  return _compareSet.has(id);
}

function removeFromCompare(productId) {
  const id = Number(productId);
  if (!_compareSet.has(id)) return;
  _compareSet.delete(id);
  _syncAllCompareButtons(id);
  _syncCompareTray();
}

function isInCompare(productId) {
  return _compareSet.has(Number(productId));
}

/* ============================================================
   COMPARISON MODAL
   ============================================================ */

function openCompareModal() {
  if (_compareSet.size === 0) return;

  document.getElementById('compareModal')?.remove();

  import('./products.js').then(({ getProductById, generateStars }) => {
    const products = [..._compareSet].map(id => getProductById(id)).filter(Boolean);
    if (products.length === 0) return;

    const modal = document.createElement('dialog');
    modal.id        = 'compareModal';
    modal.className = 'compare-modal';

    // Explicit grid placement: row 1 = image, 2 = category, 3 = title,
    // 4 = price, 5 = rating, 6 = action. Column 1 = labels, columns 2..N+1
    // = products. Explicit grid-row/grid-column keeps every cell aligned
    // regardless of DOM order (replaces the old `display: contents` flow).
    const labels = `
      <div class="compare-labels">
        <div class="compare-row compare-row--image  compare-label-cell" style="grid-row:1;grid-column:1;">Image</div>
        <div class="compare-row compare-row--cat    compare-label-cell" style="grid-row:2;grid-column:1;">Category</div>
        <div class="compare-row compare-row--title  compare-label-cell" style="grid-row:3;grid-column:1;">Title</div>
        <div class="compare-row compare-row--price  compare-label-cell" style="grid-row:4;grid-column:1;">Price</div>
        <div class="compare-row compare-row--rating compare-label-cell" style="grid-row:5;grid-column:1;">Rating</div>
        <div class="compare-row compare-row--action compare-label-cell" style="grid-row:6;grid-column:1;"></div>
      </div>`;

    const cols = products.map((p, i) => {
      const price     = `$${parseFloat(p.price).toFixed(2)}`;
      const ratingVal = p.rating?.rate  ?? 0;
      const ratingCnt = p.rating?.count ?? 0;
      const stars     = generateStars(ratingVal);
      const col       = i + 2; // column 1 is labels

      return `
        <div class="compare-col" data-id="${p.id}" style="grid-column:${col};">
          <div class="compare-row compare-row--image" style="grid-row:1;grid-column:${col};">
            <button class="compare-col-remove" data-id="${p.id}"
                    aria-label="Remove ${_esc(p.title)} from comparison">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <div class="compare-img-wrap">
              <img src="${_esc(p.image)}" alt="${_esc(p.title)}"
                   class="compare-img" width="180" height="180" loading="lazy" />
            </div>
          </div>

          <div class="compare-row compare-row--cat" style="grid-row:2;grid-column:${col};">
            <span class="compare-badge">${_esc(p.category)}</span>
          </div>

          <div class="compare-row compare-row--title" style="grid-row:3;grid-column:${col};">
            <p class="compare-title">${_esc(p.title)}</p>
          </div>

          <div class="compare-row compare-row--price" style="grid-row:4;grid-column:${col};">
            <span class="compare-price">${price}</span>
          </div>

          <div class="compare-row compare-row--rating" style="grid-row:5;grid-column:${col};"
               aria-label="${ratingVal} out of 5, ${ratingCnt} reviews">
            <span class="stars compare-stars" aria-hidden="true">${stars}</span>
            <span class="compare-rating-text">${ratingVal} <small>(${ratingCnt})</small></span>
          </div>

          <div class="compare-row compare-row--action" style="grid-row:6;grid-column:${col};">
            <button class="compare-add-cart-btn" data-id="${p.id}"
                    aria-label="Add ${_esc(p.title)} to cart">
              <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
              Add to Cart
            </button>
          </div>
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="compare-modal-inner" role="document">
        <div class="compare-modal-header">
          <h2 class="compare-modal-title">
            <i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
            Compare Products
          </h2>
          <button class="compare-modal-close icon-btn" aria-label="Close comparison">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div class="compare-body">
          <div class="compare-grid compare-cols--${products.length}">
            ${labels}${cols}
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    modal.showModal();
    modal.querySelector('.compare-modal-close')?.focus();

    // Close triggers
    modal.querySelector('.compare-modal-close')
      .addEventListener('click', () => _closeModal(modal));
    modal.addEventListener('click', e => { if (e.target === modal) _closeModal(modal); });
    modal.addEventListener('cancel', e => { e.preventDefault(); _closeModal(modal); });
    modal.addEventListener('close', () => modal.remove());

    // Per-column remove
    modal.querySelectorAll('.compare-col-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCompare(Number(btn.dataset.id));
        _closeModal(modal);
        if (_compareSet.size >= 1) setTimeout(openCompareModal, 240);
      });
    });

    // Add to cart from comparison modal
    modal.querySelectorAll('.compare-add-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = getProductById(Number(btn.dataset.id));
        if (product) import('./cart.js').then(({ addToCart }) => addToCart(product, 1));
      });
    });

    _trapFocus(modal);
  });
}

/* ============================================================
   COMPARE TRAY (floating selection bar)
   ============================================================ */

function _ensureCompareTray() {
  if (document.getElementById('compareTray')) return;

  const tray = document.createElement('div');
  tray.id        = 'compareTray';
  tray.className = 'compare-tray';
  tray.setAttribute('aria-live', 'polite');
  tray.innerHTML = `
    <span class="compare-tray-label">
      <i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
      <span id="compareTrayCount">0</span> selected
    </span>
    <div class="compare-tray-actions">
      <button class="compare-tray-clear" id="compareClearBtn">Clear</button>
      <button class="compare-tray-open" id="compareOpenBtn">Compare</button>
    </div>`;

  document.body.appendChild(tray);

  document.getElementById('compareOpenBtn')
    .addEventListener('click', openCompareModal);

  document.getElementById('compareClearBtn').addEventListener('click', () => {
    _compareSet.clear();
    _syncAllCompareButtons();
    _syncCompareTray();
  });
}

function _syncCompareTray() {
  _ensureCompareTray();
  const tray    = document.getElementById('compareTray');
  const countEl = document.getElementById('compareTrayCount');
  if (!tray) return;

  countEl.textContent = _compareSet.size;
  tray.classList.toggle('compare-tray--visible', _compareSet.size > 0);

  const openBtn = document.getElementById('compareOpenBtn');
  if (openBtn) {
    openBtn.disabled = _compareSet.size < 2;
    openBtn.setAttribute('aria-disabled', String(_compareSet.size < 2));
  }
}

/* ============================================================
   BUTTON SYNC
   ============================================================ */

function _syncAllCompareButtons(id) {
  const selector = id
    ? `.compare-btn[data-product-id="${id}"]`
    : '.compare-btn';

  document.querySelectorAll(selector).forEach(btn => {
    const btnId  = Number(btn.dataset.productId);
    const active = _compareSet.has(btnId);
    const label  = active ? 'Remove from comparison' : 'Compare';
    btn.classList.toggle('compare-btn--active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', `${label}: ${btn.dataset.title}`);
    btn.querySelector('span')
      && (btn.querySelector('span').textContent = active ? 'Added' : 'Compare');
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

function _closeModal(modal) {
  if (!modal.open) return;
  modal.classList.add('is-closing');
  setTimeout(() => {
    modal.classList.remove('is-closing');
    if (modal.open) modal.close();
  }, 220);
}

function _trapFocus(container) {
  const SEL = 'button:not([disabled]),[href],input,[tabindex]:not([tabindex="-1"])';
  container.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const nodes = [...container.querySelectorAll(SEL)];
    if (!nodes.length) return;
    if (e.shiftKey && document.activeElement === nodes[0]) {
      e.preventDefault(); nodes[nodes.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === nodes[nodes.length - 1]) {
      e.preventDefault(); nodes[0].focus();
    }
  });
}

function _showCapToast() {
  const id = 'compareCapToast';
  document.getElementById(id)?.remove();
  const toast = document.createElement('div');
  toast.id        = id;
  toast.className = 'cart-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <i class="fa-solid fa-circle-info cart-toast-icon" aria-hidden="true"></i>
    <span class="cart-toast-text">
      Max <strong>${MAX_COMPARE} products</strong> can be compared at once
    </span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('cart-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('cart-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2800);
}

function _esc(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

/* ============================================================
   INIT
   ============================================================ */

function initCompare() {
  // Comparison is session-only; tray created lazily on first toggle.
}

export { initCompare, toggleCompare, removeFromCompare, isInCompare, openCompareModal };
