'use strict';

/**
 * state.js — Single source of truth for the application.
 *
 * All mutable data lives here.
 * Nothing in this file talks to the DOM or the network.
 */

export const state = {
  /** @type {import('./api.js').ClothingItemResponse[]} */
  items: [],

  /** @type {import('./api.js').CategoryResponse[]} */
  categories: [],
  
  /**
   * How the user is currently browsing.
   * Values: 'category' | 'occasion' | 'season' | 'comfort' | 'all'
   */
  browseMode: 'all',

  /** The category currently being browsed (null = show all). */
  currentCategoryId: null,

  /** Friendly display name for the current browse view. */
  currentCategoryName: 'ALL ITEMS',
/** The active filter value for the current browseMode (null = none). */
  currentFilterValue: null,
 
  /** Carousel indices for the Find-Outfit screen. */
  topIdx: 0,
  botIdx: 0,
 
  /** Accessory carousel index */
  accIdx: 0,
 
  /** Previously saved outfits (fetched from /api/outfit) */
  savedOutfits: [],
 
  /** Outfit being assembled — holds top/bottom IDs and name before accessories are added */
  pendingOutfit: null,   // { name: string, itemIds: number[] }
 
  /** Whether the previous outfits panel is open */
  prevOutfitsOpen: false,
 
  /** Base-64 data URL staged while the user fills the add-item form. */
  pendingImageUrl: null,

  // Will It Suit Me?
  suitMeItemIds: [],
  suitMeImageBase64: null,
    editingItem: null,    // ClothingItemResponse being edited
  editingOutfit: null,  // { ...OutfitResponse, selectedItemIds: number[] }
  selectedAccIds: [],   // accessory IDs chosen on the accessorize screen
  dressIdx:  0,          // dress carousel index
  findMode:  'topbottom', // 'topbottom' | 'dress'

};
 

