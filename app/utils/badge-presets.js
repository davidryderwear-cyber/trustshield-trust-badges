// Trust Badge Icon Library -- 36 original SVG icons across 8 categories

export const BADGE_ICONS = {
  // === SECURITY ===
  secure_checkout: {
    name: "Secure Checkout",
    category: "security",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  },
  ssl_secure: {
    name: "SSL Secured",
    category: "security",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  encrypted: {
    name: "Encrypted Data",
    category: "security",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`,
  },
  verified: {
    name: "Verified Store",
    category: "security",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  },

  // === PAYMENT ===
  credit_card: {
    name: "Secure Payment",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  },
  visa: {
    name: "Visa Accepted",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/><path d="M7.5 15l1.5-6h1.5l-1.5 6z"/><path d="M11 15l2.5-6h1.5l-2.5 6z"/></svg>`,
  },
  mastercard: {
    name: "Mastercard Accepted",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><circle cx="9.5" cy="12" r="3.5"/><circle cx="14.5" cy="12" r="3.5"/></svg>`,
  },
  paypal: {
    name: "PayPal Accepted",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M9 9h3c1.5 0 2.5 1 2.5 2.5S13.5 14 12 14H10l-.5 3H7.5L9 9z"/></svg>`,
  },
  apple_pay: {
    name: "Apple Pay",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M12.5 8.5c.5-.6 1.2-1 1.8-1 .1.7-.2 1.4-.7 1.9-.5.6-1.1.9-1.8.8-.1-.7.3-1.3.7-1.7z"/><path d="M14.3 11c-1-.1-1.8.5-2.3.5s-1.2-.5-2-.5c-1 0-2 .6-2.5 1.5-1.1 1.8-.3 4.5.8 6 .5.7 1.1 1.5 1.9 1.5s1.1-.5 2-.5 1.2.5 2 .5 1.3-.8 1.8-1.5c.3-.4.5-.8.6-1.1-1.1-.4-1.8-1.5-1.8-2.7 0-1 .5-1.9 1.3-2.4-.5-.7-1.2-1.2-1.8-1.3z"/></svg>`,
  },
  shop_pay: {
    name: "Shop Pay",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M8 12h2c1.1 0 2-.9 2-2s-.9-2-2-2H8v7"/><line x1="14" y1="8" x2="14" y2="15"/><path d="M16 8h2c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2h-2"/></svg>`,
  },
  google_pay: {
    name: "Google Pay",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M12 9v6"/><path d="M9 9v3c0 1.7 1.3 3 3 3s3-1.3 3-3V9"/></svg>`,
  },
  amex: {
    name: "Amex Accepted",
    category: "payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M7 15l2-6 2 6"/><line x1="7.5" y1="13" x2="10.5" y2="13"/><path d="M13 9h3l1 3 1-3h1"/></svg>`,
  },

  // === SHIPPING ===
  free_shipping: {
    name: "Free Shipping",
    category: "shipping",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  },
  worldwide: {
    name: "Worldwide Delivery",
    category: "shipping",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
  fast_delivery: {
    name: "Fast Delivery",
    category: "shipping",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  tracked_shipping: {
    name: "Tracked Shipping",
    category: "shipping",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  package_icon: {
    name: "Secure Packaging",
    category: "shipping",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  },

  // === GUARANTEE ===
  money_back: {
    name: "Money-Back Guarantee",
    category: "guarantee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  },
  satisfaction: {
    name: "100% Satisfaction",
    category: "guarantee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
  easy_returns: {
    name: "Easy Returns",
    category: "guarantee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  },
  warranty: {
    name: "Lifetime Warranty",
    category: "guarantee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4l2 2"/></svg>`,
  },
  thirty_day: {
    name: "30-Day Returns",
    category: "guarantee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
  price_match: {
    name: "Price Match",
    category: "guarantee",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  },

  // === QUALITY ===
  quality: {
    name: "Premium Quality",
    category: "quality",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  },
  five_star: {
    name: "5-Star Rated",
    category: "quality",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  award: {
    name: "Award Winning",
    category: "quality",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/><path d="M12 5v6"/><path d="M9 8h6"/></svg>`,
  },
  made_in_usa: {
    name: "Made in USA",
    category: "quality",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  },

  // === SUPPORT ===
  support_24_7: {
    name: "24/7 Support",
    category: "support",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  },
  live_chat: {
    name: "Live Chat",
    category: "support",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  },
  email_support: {
    name: "Email Support",
    category: "support",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  },
  phone_support: {
    name: "Phone Support",
    category: "support",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  },

  // === VALUES ===
  eco_friendly: {
    name: "Eco Friendly",
    category: "values",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22c1-6 5.5-10 12-10 0-4-2-8-8-8 8 0 14 6 14 14"/><path d="M9 19c-2-1-3.5-3.5-3.5-6"/></svg>`,
  },
  handmade: {
    name: "Handmade",
    category: "values",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  },
  cruelty_free: {
    name: "Cruelty Free",
    category: "values",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M12 3v2"/><path d="M9 4l.5 1.5"/><path d="M15 4l-.5 1.5"/></svg>`,
  },
  vegan: {
    name: "Vegan",
    category: "values",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22c1-6 5.5-10 12-10 0-4-2-8-8-8 8 0 14 6 14 14"/><path d="M9 19c-2-1-3.5-3.5-3.5-6"/><circle cx="15" cy="8" r="3"/></svg>`,
  },
  carbon_neutral: {
    name: "Carbon Neutral",
    category: "values",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z"/><path d="M7 12l3 3 7-7"/><path d="M2 22l4-4"/></svg>`,
  },
  family_owned: {
    name: "Family Owned",
    category: "values",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
};

export const BADGE_TEMPLATES = {
  ecommerce_essentials: {
    name: "E-commerce Essentials",
    description: "The must-have trust signals for any online store",
    badges: ["secure_checkout", "free_shipping", "money_back", "support_24_7"],
  },
  security_focused: {
    name: "Security & Payment",
    description: "Build confidence around checkout safety",
    badges: ["ssl_secure", "secure_checkout", "credit_card", "satisfaction"],
  },
  payment_methods: {
    name: "Payment Methods",
    description: "Show all accepted payment types",
    badges: ["visa", "mastercard", "paypal", "amex", "apple_pay"],
  },
  shipping_returns: {
    name: "Shipping & Returns",
    description: "Reduce buyer hesitation around delivery",
    badges: ["free_shipping", "worldwide", "easy_returns", "tracked_shipping"],
  },
  premium_brand: {
    name: "Premium Brand",
    description: "For stores that emphasize quality and values",
    badges: ["quality", "satisfaction", "handmade", "eco_friendly"],
  },
  full_trust: {
    name: "Full Trust Stack",
    description: "Maximum confidence -- all key trust signals",
    badges: ["secure_checkout", "free_shipping", "money_back", "thirty_day", "support_24_7"],
  },
  minimal: {
    name: "Minimal (3 Badges)",
    description: "Clean and simple for minimalist stores",
    badges: ["secure_checkout", "free_shipping", "money_back"],
  },
};

export const BADGE_CATEGORIES = [
  { key: "payment", label: "Payment Methods" },
  { key: "security", label: "Security" },
  { key: "shipping", label: "Shipping" },
  { key: "guarantee", label: "Guarantee" },
  { key: "quality", label: "Quality" },
  { key: "support", label: "Support" },
  { key: "values", label: "Values" },
];

export const PLAN_LIMITS = {
  free:         { maxBadges: 3,   customColors: false, removeBranding: false, customCSS: false, cartPage: false, customUpload: false, abTesting: false, tagTargeting: false, geolocation: false, translations: false, scheduling: false },
  starter:      { maxBadges: 999, customColors: true,  removeBranding: true,  customCSS: false, cartPage: false, customUpload: true,  abTesting: false, tagTargeting: false, geolocation: false, translations: false, scheduling: false },
  essential:    { maxBadges: 999, customColors: true,  removeBranding: true,  customCSS: false, cartPage: true,  customUpload: true,  abTesting: true,  tagTargeting: true,  geolocation: true,  translations: true,  scheduling: true  },
  professional: { maxBadges: 999, customColors: true,  removeBranding: true,  customCSS: true,  cartPage: true,  customUpload: true,  abTesting: true,  tagTargeting: true,  geolocation: true,  translations: true,  scheduling: true  },
};
