'use strict';

/**
 * api.js — thin wrapper around every Spring Boot endpoint.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  Base URL                                                │
 * │  Change BASE_URL if your backend runs on a different     │
 * │  origin or port, e.g. 'http://localhost:8080'.           │
 * │  An empty string means "same origin" (Thymeleaf / proxy) │
 * └──────────────────────────────────────────────────────────┘
 *
 * DTOs (mirrors of the Java classes):
 *
 *   CategoryResponse   { id: number, name: string, description: string }
 *
 *   ClothingItemResponse {
 *     id: number, color: string, imgUrl: string, note: string,
 *     isComfortable: boolean, ocassionList: string[],
 *     season: string, categoryName: string
 *   }
 *
 *   ClothingItemRequest {
 *     color: string, imgUrl: string, note?: string,
 *     isComfortable: boolean, ocassionList: string[],
 *     season?: string, categoryId: number
 *   }
 */

const BASE_URL = 'http://localhost:8080';   // ← change to 'http://localhost:8080' for local dev

/* ── helpers ─────────────────────────────────────────────── */

async function request(path, options = {}) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  console.log('request() token:', token, 'path:', path); // ← add this
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json',...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let errorMessage = 'Something went wrong';

    try {
        const error = await res.json();
        errorMessage = error.message || errorMessage;
    } catch {
        errorMessage = await res.text();
    }

    throw new Error(errorMessage);
}
  // 204 No Content has no body
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ── Auth endpoints ──────────────────────────────────────── */
 
/**
 * POST /api/auth/register
 * @param {{ username, email, password }} payload
 * @returns {Promise<{ token, email, username }>}
 */
export async function register(payload) {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}
 
/**
 * POST /api/auth/login
 * @param {{ email: string, password: string, rememberMe: boolean }} payload
 * @returns {Promise<{ token, email, username }>}
 */
export async function login(payload) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}
 

/* ── Category endpoints ──────────────────────────────────── */

/**
 * GET /api/category
 * @returns {Promise<CategoryResponse[]>}
 */
export async function fetchCategories() {
  return request('/api/category');
}

/* ── ClothingItem endpoints ──────────────────────────────── */

/**
 * GET /api/items
 * @returns {Promise<ClothingItemResponse[]>}
 */
export async function fetchAllItems() {
  return request('/api/items');
}

/**
 * GET /api/items/category/{categoryId}
 * @param {number} categoryId
 * @returns {Promise<ClothingItemResponse[]>}
 */
export async function fetchItemsByCategory(categoryId) {
  return request(`/api/items/category/${categoryId}`);
}

/**
 * GET /api/items/occasions/{occasion}
 * @param {string} occasion
 * @returns {Promise<ClothingItemResponse[]>}
 */
export async function fetchItemsByOccasion(occasion) {
  return request(`/api/items/occasions/${encodeURIComponent(occasion)}`);
}

/**
 * POST /api/items
 * @param {ClothingItemRequest} payload
 * @returns {Promise<ClothingItemResponse>}
 */
export async function addItem(payload) {
  return request('/api/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/items/{id}
 * @param {number} id
 * @returns {Promise<null>}
 */
export async function deleteItem(id) {
  return request(`/api/items/${id}`, { method: 'DELETE' });
}

/**
 * GET /api/items/season/{season}
 * Requires adding this endpoint to ClothingItemController — see note below.
 * @param {string} season  e.g. "SUMMER"
 * @returns {Promise<ClothingItemResponse[]>}
 */
export async function fetchItemsBySeason(season) {
  return request(`/api/items/season/${encodeURIComponent(season)}`);
}
 
/**
 * GET /api/items/comfort/{comfortable}
 * Requires adding this endpoint to ClothingItemController — see note below.
 * @param {boolean} comfortable
 * @returns {Promise<ClothingItemResponse[]>}
 */
export async function fetchItemsByComfort(comfortable) {
  return request(`/api/items/comfort/${comfortable}`);
}
 
/**
 * POST /api/outfits
 * Save a complete outfit (top + bottom + accessories).
 * @param {{ topId: number, bottomId: number, accessoryIds: number[] }} payload
 * @returns {Promise<any>}
 */
/**
 * POST /api/outfit
 * @param {{ name: string, description: string, clothingItemsIds: number[] }} payload
 * @returns {Promise<OutfitResponse>}
 */
export async function saveOutfit(payload) {
  return request('/api/outfit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
 
/**
 * GET /api/outfit
 * @returns {Promise<OutfitResponse[]>}
 */
export async function fetchOutfits() {
  return request('/api/outfit');
}

/**
 * DELETE /api/outfit/{id}
 * @param {number} id
 * @returns {Promise<null>}
 */
export async function deleteOutfit(outfitId) {
  return request(`/api/outfit/${outfitId}`, { method: 'DELETE' });
}


/**
 * POST /api/outfit-advice
 * @param {{
 *   itemsImgUrls: string[],
 *   itemsCategory: string[],
 *   itemsColors: string[],
 *   prompt: string
 * }} payload
 */
export async function getOutfitAdvice(payload) {
   return request('/api/outfit-advice',
     { method: 'POST',
       body: JSON.stringify(payload) }); }
 
 
/**
 * POST /api/outfit-Analysis
 * @param {number[]} clothingItemIds
 * @param {string}   userImageBase64  data URL
 * @returns {Promise<OutfitAnalysisResponse>}
 */
export async function willItSuitMe(clothingItemIds, userImageBase64) {
  return request('/api/outfit-Analysis', {
    method: 'POST',
    body: JSON.stringify({ clothingItemIds, userImageBase64 }),
  });
}
 
/**
 * GET /api/outfit-Analysis/history
 * @returns {Promise<OutfitAnalysisHistoryResponse[]>}
 */
export async function fetchAnalysisHistory() {
  return request('/api/outfit-Analysis/history');
}
 
/**
 * DELETE /api/outfit-Analysis/{id}
 * @param {number} id
 * @returns {Promise<null>}
 */
export async function deleteAnalysis(id) {
  return request(`/api/outfit-Analysis/${id}`, { method: 'DELETE' });
}


/**
 * POST /api/outfit/update-Outfit/{id}
 * @param {number} id
 * @param {{ name, description, clothingItemsIds }} payload
 */
export async function updateOutfit(id, payload) {
  return request(`/api/outfit/update-Outfit/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

/**
 * POST /api/items/edit-Item/{id}
 * @param {number} id
 * @param {ClothingItemRequest} payload
 */
export async function updateItem(itemId, payload) {
  return request(`/api/items/edit-Item/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

/**
 * POST /api/auth/forgot-Password
 * @param {{ email: string }} payload
 */
export async function forgotPassword(payload) {
  return request('/api/auth/forgot-Password', { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * POST /api/auth/verify-OTP
 * @param {{ email: string, otp: string }} payload
 */
export async function verifyOtp(payload) {
  return request('/api/auth/verify-OTP', { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * PUT /api/auth/reset-password
 * @param {{ email: string, newPassword: string }} payload
 */
export async function resetPassword(payload) {
  return request('/api/auth/reset-password', { method: 'PUT', body: JSON.stringify(payload) });
}