/* ============================================================
   api.js — Data fetching layer
   ============================================================ */

const API_BASE = 'https://fakestoreapi.com';

/**
 * Fetches all products from the Fake Store API.
 * @returns {Promise<Array>} Array of product objects.
 * @throws {Error} If the network request fails or response is not OK.
 */
async function fetchProducts() {
  const response = await fetch(`${API_BASE}/products`);

  if (!response.ok) {
    throw new Error(
      `Failed to load products (HTTP ${response.status}). Please try again.`
    );
  }

  const data = await response.json();
  return data;
}

export { fetchProducts };
