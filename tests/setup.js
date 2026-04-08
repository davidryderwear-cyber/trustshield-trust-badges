import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver (required by Polaris Popover, Tooltip, etc.)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  constructor() { this.root = null; this.rootMargin = ""; this.thresholds = []; }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Mock Shopify App Bridge (used by shopify.toast.show in the component)
globalThis.shopify = { toast: { show: vi.fn() } };

// Mock window.matchMedia (required by Polaris breakpoints + MediaQueryProvider)
window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    media: "",
    onchange: null,
    addListener: function () {},
    removeListener: function () {},
    addEventListener: function () {},
    removeEventListener: function () {},
    dispatchEvent: function () { return false; },
  };
};

// Ensure matchMedia always returns a proper object (Polaris accesses .matches directly)
const originalMatchMedia = window.matchMedia;
window.matchMedia = function (query) {
  const result = originalMatchMedia(query);
  if (!result) {
    return {
      matches: false,
      media: query || "",
      onchange: null,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return false; },
    };
  }
  return result;
};
