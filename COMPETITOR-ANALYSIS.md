# Competitor Analysis: Essential Trust Badges & Icons

**App Store**: https://apps.shopify.com/essential-icon-badge-banners
**Demo Store**: https://essentialbanners.myshopify.com
**Rating**: 5.0 ★ (948 reviews) — "Built for Shopify"
**Developer**: Essential Apps

---

## Pricing Tiers

| | Free | Starter | Essential (Popular) | Professional |
|---|---|---|---|---|
| **Price** | $0 | $6.99/mo | $9.99/mo | $29.99/mo |
| **Yearly** | - | ~$5.59/mo (20% off) | ~$7.99/mo | ~$23.99/mo |
| **Monthly Views** | 5,000 | 20,000 | 50,000 | Unlimited |
| **Product Page Blocks** | 1 | Unlimited | Unlimited | Unlimited |
| **Icons Per Block** | 3 | Unlimited | Unlimited | Unlimited |
| **Custom Icon Upload** | ❌ | ✅ | ✅ | ✅ |
| **Cart Page Blocks** | ❌ | ❌ | ✅ | ✅ |
| **Product Tag Targeting** | ❌ | ❌ | ✅ | ✅ |
| **Geolocation Targeting** | ❌ | ❌ | ✅ | ✅ |
| **Translations** | ❌ | ❌ | ✅ | ✅ |
| **Payment Icons** | ✅ Unlimited | ✅ | ✅ | ✅ |

**Notes:**
- 30-day money back guarantee on all paid plans
- 7-day free trial on paid plans
- Monthly/Yearly toggle (save 20%)
- View-based pricing creates natural upgrade pressure as store grows

---

## Admin UI Structure

### Dashboard (Home Page)
- **Partner program banner** at top: "30% commission, first payout at $100"
- **"Your Badges"** section with "Create new badge" button (top right)
- **Setup guide**: 3-step onboarding checklist
  1. ✅ Activate app embed in Shopify
  2. Create your first badge
  3. Confirm your badge is working properly
- **Video Tutorial** link in setup guide
- **"Apps you might like"** cross-promotion section at bottom
- **Left nav**: Main app, Pricing plans, Apps suite

### Badge Builder — 3 Tabs

#### Tab 1: Content
- **Badge type** (radio buttons):
  - Single banner
  - Icon block
  - Minimal icons
  - Payment icons
- **Badge name** (internal reference only)
- **Title** (e.g., "Free Shipping")
- **Subheading** (e.g., "Delivered to Your doorstep, on us!")
- **Icon** preview + Remove/Upload buttons
  - Upload: gated to Starter plan
- **Call to action** dropdown (No call to action / custom)
- **Translations**: gated to Essential plan
- **Scheduling**: Start (Right now / Specific date), End date — gated to Essential plan
- **Live preview** on right side of page
- **Cross-sell banner**: "Combine with Free Shipping Bar" upsell

#### Tab 2: Design
- **Template** dropdown: "Minimal" (likely multiple presets)
- **Card**:
  - Single color background / Gradient background
  - Background color picker (#FFFFFF default)
  - Corner radius: 8px
  - Border size: 0px, Border color: #c5c8d1
- **Spacing**:
  - Inside top/bottom: 16px / 16px
  - Outside top/bottom: 20px / 20px
- **Icon**:
  - Icon size: 32px
  - "Use original icon color" checkbox
  - Icon color: #333333
  - Background color: #ffffff
  - Corner radius: 4px
- **Typography**:
  - Font: "Use your theme fonts" dropdown
  - Icon title size and color: **16px, #202223**
  - Icon subheading size and color: **14px, #96a4b6**

#### Tab 3: Placement
- **Select products**:
  - All products (default, free)
  - Specific products (free)
  - All products in specific collections (free)
  - All products with specific tags (gated — Essential plan)
  - Custom position — app blocks (free)
- **Geolocation targeting** (gated — Essential plan):
  - All world (default)
  - Specific countries

### Pricing Plans Page
- Usage bar showing views consumed (e.g., "0 / 5000 monthly views")
- Current plan highlighted
- Monthly/Yearly toggle
- Feature comparison for each tier
- "Start FREE 7-day trial" CTA on all paid plans
- 30-day money back guarantee badge at bottom

### Apps Suite Page
- Cross-sells "Essential Free Shipping Upsell" companion app
- Value props: Increase AOV, Reduce cart abandonment, Satisfaction guarantee
- Screenshots/video of companion app

---

## Front-End Rendered Specs (from live DOM inspection)

### Product Page Badges
- **Outer container**: `div.icon-block-container` — CSS Grid, gap 16px 8px, justify center
- **Each badge**: `div.icon-block` — equal width columns (~111px in 3-col)
  - CSS Grid internally, gap 4px
- **Text wrapper**: `div.text-container` — flex column, align center
- **Title**: `span.title` — 16px, font-weight 600
- **Subtitle**: 14px, font-weight 400, color rgb(150, 150, 150) / #969696
- **Section wrapper**: `div.essential-side-cart-banner` — padding 10px, margin 5px 0 0

### Cart Drawer Badges
- Same badge component cloned into cart drawer footer
- Positioned BELOW "Check out" button
- 3 equal columns with same styling
- Slightly scaled for narrower drawer width

### Badge Types Available
1. **Single banner** — full-width banner with icon + text
2. **Icon block** — multiple icons in a row (the main trust badge style)
3. **Minimal icons** — smaller, text-only style
4. **Payment icons** — Visa, Mastercard, Amex, Apple Pay etc.

---

## Key Competitive Differentiators (What They Do Well)

1. **Onboarding UX** — 3-step setup guide with video tutorial, very beginner-friendly
2. **Live preview** — Real-time badge preview while editing (right side panel)
3. **Feature gating** — Free plan is genuinely useful (1 product page block, 3 icons). Upgrade prompts are contextual, not aggressive
4. **View-based pricing** — Creates natural upgrade path as store grows
5. **Cross-selling** — "Apps suite" promotes their companion Free Shipping Bar app
6. **Partner program** — 30% commission affiliate program built into the app dashboard
7. **Draft/Publish flow** — Badges start as "Draft" and get explicitly published
8. **Granular design controls** — Every pixel customizable (spacing, colors, typography, corners)
9. **Multiple badge types** — Not just icon blocks, also banners, minimal, and payment icons

---

## What We Can Improve / Our Advantages to Build

### Immediate (match parity):
- [ ] 3-tab badge builder UI (Content / Design / Placement)
- [ ] Live preview panel while editing
- [ ] Setup guide / onboarding checklist
- [ ] Draft/Publish workflow
- [ ] Template presets (Minimal, Bold, etc.)
- [ ] Granular design controls matching their specs

### Differentiators (beat them):
- [ ] **A/B testing** — They don't have this. We already built the foundation
- [ ] **Analytics dashboard** — Impression/click tracking per badge
- [ ] **AI badge suggestions** — Auto-suggest badges based on store category
- [ ] **One-click templates** — Pre-built badge sets (e.g., "E-commerce starter pack")
- [ ] **Smart placement** — Auto-position without theme editor (we already do this)
- [ ] **Cart drawer auto-inject** — We already do this, they require manual setup

### Pricing strategy:
- Match their tiers but undercut slightly OR match exactly
- Consider: Free → $4.99 → $9.99 → $19.99
- Keep A/B testing as a premium differentiator on higher tiers

---

## Screenshots Saved
All competitor screenshots saved to disk during this session:
- Dashboard / home page
- Badge builder: Content tab
- Badge builder: Design tab (full settings)
- Badge builder: Placement tab
- Pricing plans page
- Apps suite / cross-sell page
- Front-end: product page badges
- Front-end: cart drawer badges

---

*Analysis completed: April 5, 2026*
*Extension version: trustshield-trust-badges-18*
