// Access Overrides
// Allows bypassing tier-based access restrictions for testing/demo purposes

export const isLabsAndGoldBypassEnabled: boolean =
  import.meta.env.VITE_LABS_GOLD_BYPASS === 'true' ||
  new URLSearchParams(window.location.search).has('bypass_labs');
