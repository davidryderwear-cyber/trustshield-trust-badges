import "@testing-library/jest-dom/vitest";

// Mock Shopify App Bridge (used by shopify.toast.show in the component)
globalThis.shopify = { toast: { show: vi.fn() } };

// Mock window.matchMedia (required by Polaris breakpoints)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
