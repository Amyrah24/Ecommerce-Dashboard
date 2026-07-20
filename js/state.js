// js/state.js
// The ONLY place filter values and the active profile live. Charts and filter
// controls never talk to each other directly — they all go through this module.

const listeners = new Set();

const state = {
  rawData: [],
  profile: 'adult', // 'adult' | 'child' | 'elderly'
  filters: {
    region: 'All',
    category: 'All',
    product: 'All',
    shippingStatus: [], // empty array = no restriction
    searchQuery: '', // empty string = no restriction
    
    // --- VISUAL CROSS-FILTER SELECTIONS ---
    selectedRegion: null,   // tracks heatmap / region cross-filter selection
    selectedCategory: null, // tracks bar chart cross-filter selection
    selectedStatus: null,   // tracks donut/fulfillment cross-filter selection
  },
};

export function setRawData(rows) {
  state.rawData = rows;
  notify();
}

export function getRawData() {
  return state.rawData;
}

export function getProfile() {
  return state.profile;
}

export function setProfile(profile) {
  state.profile = profile;
  notify();
}

export function getFilters() {
  return { ...state.filters };
}

/** Merge a partial filter update, e.g. setFilter({ selectedCategory: 'Electronics' }) */
export function setFilter(partial) {
  state.filters = { ...state.filters, ...partial };
  notify();
}

export function resetFilters() {
  state.filters = {
    region: 'All',
    category: 'All',
    product: 'All',
    shippingStatus: [],
    searchQuery: '',
    selectedRegion: null,
    selectedCategory: null,
    selectedStatus: null,
  };
  notify();
}

/**
 * The single derivation function all charts read through.
 */
export function filteredData() {
  const { 
    region, 
    category, 
    product, 
    shippingStatus, 
    searchQuery, 
    selectedRegion, 
    selectedCategory,
    selectedStatus 
  } = state.filters;

  return state.rawData.filter((d) => {
    // 1. Sidebar Dropdown & Checkbox Filters
    if (region !== 'All' && d.region !== region) return false;
    if (category !== 'All' && d.category !== category) return false;
    if (product !== 'All' && d.product !== product) return false;
    if (shippingStatus.length > 0 && !shippingStatus.includes(d.shippingStatus)) return false;

    // 2. Visual Cross-Filtering Checks (Chart Click Interactions)
    if (selectedRegion && d.region !== selectedRegion) return false;
    if (selectedCategory && d.category !== selectedCategory) return false;
    if (selectedStatus && d.shippingStatus !== selectedStatus) return false;

    // 3. Real-Time Dynamic Search Check across product & category
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchProduct = d.product && d.product.toLowerCase().includes(q);
      const matchCategory = d.category && d.category.toLowerCase().includes(q);
      if (!matchProduct && !matchCategory) return false;
    }

    return true;
  });
}

/** Subscribe to any state change. Returns an unsubscribe fn. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}