# TrustShield — App Store Submission Guide

A step-by-step checklist to submit TrustShield to the Shopify App Store. Copy/paste fields are ready below. Things only you can do are marked **[YOU]**.

---

## 0. Pre-flight (already done ✅)
- ✅ App live on Railway; all P0/security/compliance fixes deployed
- ✅ Theme extension at version 36 (clean theme check)
- ✅ GDPR webhooks (customer data request / redact / shop redact) + APP_UNINSTALLED handled
- ✅ Shopify Billing API wired (Free/Starter/Essential/Professional)
- ✅ GraphQL Admin API only · embedded · session-token auth
- ✅ **Public** privacy + terms URLs (verified live):
  - https://trustshield-trust-badges-production.up.railway.app/privacy
  - https://trustshield-trust-badges-production.up.railway.app/terms
- ✅ App icon 1200×1200 (`app-icon.png`)

## 1. [YOU] App Store registration ($19 one-time)
1. Go to https://partners.shopify.com → log in as **david.ryderwear@gmail.com** (Makaveli Digital).
2. **Settings → App Store registration → Register now** (if not already done). Pay the $19 one-time fee yourself — I can't enter payment details.

## 2. Open the listing editor
Partner Dashboard → **Apps → TrustShield Trust Badges → Distribution → Shopify App Store → Create listing** (or **Manage listing**).

## 3. Listing fields — copy/paste

**App name**
```
TrustShield Trust Badges
```

**Tagline (≤80 chars)**
```
Beautiful trust badges that boost conversions and reduce cart abandonment
```

**App introduction / short description (≤300 chars)**
```
Add professional trust badges to your product pages and cart to increase buyer confidence and reduce cart abandonment. 36 built-in icons, 4 badge styles, live preview editor, and one-click setup. Free plan available.
```

**Detailed description** — paste the "Detailed Description" section from `APP_STORE_LISTING.md` (features, plans, setup). It's accurate to the shipped product.

**Pricing** — enter to match the in-app plans:
| Plan | Price | Trial |
|---|---|---|
| Free | $0 | — |
| Starter | $6.99/mo | 7 days |
| Essential | $9.99/mo | 7 days |
| Professional | $29.99/mo | 7 days |

**Categories:** Store design · Trust and security
**Search terms:** trust badges, security badges, payment icons, conversion optimization, social proof
**App icon:** upload `app-icon.png` (1200×1200)
**Privacy policy URL:** `…railway.app/privacy`
**Support email:** `support@makaveli.digital`

## 4. [YOU] Screenshots (≥3 required; 5–6 recommended)
**Format:** 1600×900 px (16:9), PNG/JPG. The four I captured this session (visible in our chat) cover the right screens — save/crop them, or re-shoot at 1600×900:
1. **Dashboard** — setup guide + "badges configured"
2. **Badge editor** — Content tab with the live preview panel (shows customization)
3. **Storefront product page** — badges below the buy button (the money shot — lead with this)
4. **Pricing plans** — shows Free + paid tiers
Optional 5th: **Design tab** with a template applied (color customization).
*Tip:* crop out the browser chrome; a thin caption strip per image ("Customize in real time", "Live on your storefront") lifts conversion.

## 5. [YOU] Demo video
Record the ~75s screencast in `DEMO_VIDEO_SCRIPT.md` (English audio or subtitles). Upload to the listing.

## 6. Final checks before submit
- [ ] Install flow works on a fresh dev store (OAuth → lands on dashboard)
- [ ] Uninstall then reinstall — confirm clean re-auth (note: scopes were narrowed, so a re-consent prompt is expected)
- [ ] Every listing link resolves (privacy/terms/support)
- [ ] No placeholder text; claims match the plan features
- [ ] Screenshots + icon uploaded; video plays

## 7. [YOU] Submit for review
Click **Submit for review**. Automated checks run first, then manual review (typically 4–7 business days).

## Common rejection reasons (all already addressed ✅)
- Missing GDPR webhooks → ✅ handled
- Not using Shopify Billing → ✅ used
- Performance / broken install → ✅ verified working
- Missing/!public privacy policy → ✅ public URL live
- Auth-gated policy link → ✅ fixed (was the one real blocker)

## Notes / known follow-ups (not blockers)
- Custom CSS (Pro) is stored but not yet rendered to the storefront — either finish it or don't lean on it in marketing.
- Scheduling (Essential) needs a cron to flip badges on/off at the scheduled time.
- Cart-page rendering is drawer-injection only (no full cart-page block yet).
