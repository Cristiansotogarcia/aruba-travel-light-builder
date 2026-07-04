# Native Customer App (Expo) — Design Spec

- **Status:** Approved for planning (design approved 2026-06-29)
- **Date:** 2026-06-29
- **Branch:** `test_environment`
- **Program context:** Converts the existing Travel Light Aruba rental website into a **native customer-experience mobile app** for Android and iOS, published to the App Store and Google Play. Reuses the existing Supabase backend and business logic; rebuilds the customer UI natively.
- **Decision authority:** Scope and platform choices below were decided with the user in a brainstorming session on 2026-06-29.

---

## 1. Problem & goal

The product today is a React 19 + Vite web app (public rental site + role-gated operations back-offices) on Supabase. The business wants a **full customer-experience native app** (APK / iOS) — a focused, store-published app that lets customers browse equipment, book (delivery or pickup), manage their bookings, track deliveries, and receive push notifications, with native niceties (biometric login, full-screen pickup QR).

This spec covers **only the customer experience as a standalone native app**. Staff surfaces (Admin, Accounting, Driver, Booker, Depot) stay on the web for now.

## 2. Key decisions (from brainstorming, 2026-06-29)

| Decision | Choice | Rationale |
|---|---|---|
| App scope | **Customer-only** app | Smallest bundle, simplest store listing, fastest review. Staff stays on web. |
| Native shell | **Expo full native rewrite** (React Native) | User has Expo experience and wants true native UX/performance + EAS cloud builds. Chosen over Capacitor (reuse-the-webview) and Expo-as-webview after a documented Context7 comparison. |
| Code sharing | **Monorepo + shared `@tla/core` package** | Single source of truth for types/queries/pricing/validation; prevents logic drift between web and mobile. |
| Customer signup | **Email + password (with email verification)** | Net-new (no customer self-registration exists today). Forces the `profiles` RLS hardening. |
| v1 feature scope | Browse + book + cart; My bookings + tracking; Push + QR + biometric; Content pages | Full customer journey in first release. |
| Payments | **Keep manual payment links** (external) | Apple/Google permit external payment for physical-goods rental; no IAP/Stripe work in v1. |
| Driver/Depot apps | **Out of scope** (future separate native apps) | W2/W3 remain their own programs. |

### Trade-off accepted
Expo full native rewrite means **all UI is rebuilt** (≈391 web UI files) and the mobile client **forks from the website's UI permanently**. Only business logic is shared. Estimated **2–4 months** for a polished v1. The user accepted this knowingly in favor of native UX and toolchain familiarity.

### Context7 verification (libraries grounded in current docs)
Expo SDK 54+ / EAS Build, `expo-router` (file routing + push deep-links), `expo-notifications`, `expo-local-authentication` (Face ID requires a dev build + `NSFaceIDUsageDescription`), `expo-secure-store`, Supabase `LargeSecureStore` pattern (AES-256 key in SecureStore + ciphertext in AsyncStorage), `react-native-maps`, NativeWind.

## 3. Architecture

A **pnpm + Turborepo monorepo** with three workspaces. The existing website moves in unchanged; the Expo app is new; a shared core package becomes the single source of truth.

```
aruba-travel-light/ (monorepo root)
├── packages/
│   └── core/                # @tla/core — platform-agnostic (NO React DOM, NO RN UI)
│       ├── types/           # Product, BookingFormData, CustomerInfo, Supabase types
│       ├── supabase/        # createClient factory (storage injected by each app)
│       ├── queries/         # products, availability, booking-create, bookings, customers
│       ├── pricing/         # deliveryFee.ts (Sunday / short / weekly rules)
│       └── validation/      # zod schemas, slugify, validators
├── apps/
│   ├── web/                 # existing Vite site — refactored to import @tla/core
│   └── mobile/              # NEW Expo app — imports @tla/core
└── supabase/                # shared migrations + edge functions (already exists)
```

**Reused as-is:** Supabase backend, RPCs (`create_booking_with_items`, `get_public_tracking_details`), edge functions, TanStack Query, all `@tla/core` logic.

**Rebuilt natively in `apps/mobile`:** every screen. Radix/shadcn → React Native primitives; Tailwind classes → **NativeWind** (class names preserved); `react-leaflet` → `react-native-maps`; `dangerouslySetInnerHTML` → an HTML/Markdown-to-RN renderer.

**Surgical web refactor:** `src/integrations/supabase/client.ts` is moved into `@tla/core` as a `createClient` factory with **storage injected per app** — web passes `sessionStorage`, mobile passes `LargeSecureStore`. This is the only behavioral change to the web app; it must be regression-tested.

## 4. Expo app technical stack

| Concern | Choice | Note |
|---|---|---|
| Framework | Expo SDK 54+ (managed) + EAS Build | iOS built in the cloud — no Mac required |
| Navigation | `expo-router` (file-based) | Native deep links; push taps route via `router.push(url)` |
| Styling | NativeWind | Reuse Tailwind class names + theme tokens |
| Data | `@tanstack/react-query` (existing dep) | Platform-agnostic; reused directly |
| Supabase session | `LargeSecureStore` (AES-256 key in `expo-secure-store` + ciphertext in AsyncStorage) | Supabase's documented Expo pattern; resolves the `sessionStorage` blocker |
| Maps | `react-native-maps` | Delivery tracking |
| Push | `expo-notifications` + new edge function | Deep-link observer in root layout |
| Biometrics | `expo-local-authentication` | Face ID needs a dev build + `NSFaceIDUsageDescription` |
| QR display | Expo QR/barcode render + brightness boost | Customer *displays* the `pickup_code` QR; depot scans it |

## 5. Navigation / screen map (maps to existing web routes)

```
(auth)        → Login, Sign Up (NEW), Verify Email, Forgot Password
(tabs)
  ├── Home          ← Index.tsx
  ├── Browse        ← Equipment.tsx (+ filters) → Item detail ← EquipmentItem.tsx
  ├── Cart          ← Cart.tsx → Booking flow ← BookingForm.tsx (delivery / pickup)
  └── Account       ← CustomerDashboard.tsx
        ├── My Bookings → Booking detail → Live Tracking ← DeliveryTracking.tsx
        ├── Pickup QR (full-screen)
        └── Settings (biometric toggle, notifications, logout)
(modal)       → Content: About, Contact, Policies, FAQ
```

Booking flow preserves existing business rules: delivery/pickup fulfillment selector, delivery-fee logic (Sunday $20 one-time; short rental < 5 days $10; weekly ≥ 5 days free), date-aware availability, pickup-code generation for pickup bookings.

## 6. Auth & security (email + password)

- **Sign up:** `supabase.auth.signUp({ email, password })` → email verification → role **forced to `Customer` server-side** (never client-supplied).
- **HARD GATE — security fixes first.** Customer self-signup **cannot ship** until:
  - `profiles` RLS is enabled with `INSERT WITH CHECK (id = auth.uid() AND role = 'Customer')`, **or** profile creation moves into a `SECURITY DEFINER` `handle_new_user` trigger that forces a non-privileged role; and
  - the client-supplied `role` at signup is removed.
  (Per `docs/CODEBASE_ASSESSMENT_2026-06-17.md` §2.4 and `docs/SECURITY_FIXES_2026-06-26.md`, RLS on `profiles` is not enabled and signup trusts a client `role` — a privilege-escalation path. A customer app over a broken auth model is unsafe to publish.)
- **Session:** persisted via `LargeSecureStore`; `autoRefreshToken` driven by React Native `AppState`.
- **Biometric unlock:** after first successful login, gate app re-open behind Face ID / fingerprint; the refresh token stays in secure store.

## 7. Native features

- **Push notifications:** new `push_tokens` table (`user_id`, `expo_token`, `platform`, timestamps) with RLS; register the Expo push token after login; a new **`send-push-notification` edge function** fired from the same booking-status hooks that already send emails (confirmed, payment received, driver en route, pickup ready). Notification taps deep-link into the relevant screen via the `expo-router` notification observer in the root layout.
- **Pickup QR / wallet pass:** full-screen QR encoding the existing `pickup_code` with max screen brightness. Apple/Google Wallet pass is a fast-follow (not v1).
- **Biometric / saved login:** as in §6.

## 8. Payments (unchanged)

Keep the **manual payment-link** model: booking created → link emailed (existing `send-payment-link-email`) → opened in an **in-app browser**. Apple/Google permit external payment for **physical-goods rental**, so no in-app purchase and no Stripe work in v1. Stripe remains deferred, separate scope.

## 9. Backend changes required (small, additive)

1. **Phase 0 security (blocker):** enable `profiles` RLS + safe `INSERT WITH CHECK`; stop trusting client `role`. Carry the other audit blockers that affect the shared repo (DOMPurify alias removal, secret rotation, prerender escaping) as repo hygiene.
2. `push_tokens` table + RLS.
3. New `send-push-notification` edge function (Expo Push API).
4. Confirm `create_booking_with_items` behaves for an **authenticated customer** (works for guests today).

## 10. Phased delivery plan

- **Phase 0 — Foundation & security (blocker):** stand up the monorepo (pnpm + Turborepo); extract `@tla/core`; refactor the web app to import it and **prove no regression**; land the `profiles` RLS + signup-role fix.
- **Phase 1 — Expo scaffold + auth:** Expo Router app, NativeWind + theme tokens, Supabase secure client (`LargeSecureStore`), signup / login / verify / forgot-password, biometric unlock, first EAS dev build.
- **Phase 2 — Commerce:** Home, Browse + filters, Item detail, Cart, full booking flow (delivery/pickup, pricing, date-aware availability, pickup code).
- **Phase 3 — Account & tracking:** My Bookings, booking detail, live tracking map (`react-native-maps`), content pages (About/Contact/Policies/FAQ).
- **Phase 4 — Native features:** push pipeline + deep links, full-screen pickup QR, polish, offline-friendly query caching (read caching).
- **Phase 5 — Store readiness:** app icon / splash, store listings, privacy disclosures (Face ID, notifications, location), EAS production builds, TestFlight / Play Internal testing, submission.

## 11. Out of scope (YAGNI for v1)

Driver app (W3) and depot app (W2) — future separate native apps. Stripe / in-app card payment. Apple/Google Wallet passes (fast-follow). Offline **write** queue (read caching only). Social login (Apple/Google). Multi-language.

## 12. Risks & prerequisites

- **Security fixes are a hard gate** — a customer app with broken `profiles` RLS is dangerous to ship (§6).
- **Accounts:** Apple Developer Program ($99/yr) and Google Play Console ($25 one-time) required for store builds.
- **Brand assets:** app icon, splash, store screenshots needed for Phase 5.
- **Effort:** ≈2–4 months for a polished v1 — the UI is a genuine native rebuild, not a port.
- **Monorepo migration risk:** moving the live web app into `apps/web` must not regress production; Phase 0 includes a regression checkpoint.
- **Two-client drift risk:** mitigated by `@tla/core` as the single source of business logic.

## 13. Success criteria

1. A customer can install the app from TestFlight / Play Internal, **self-register**, verify email, and log in (with biometric unlock thereafter).
2. A customer can browse equipment, add to cart, and complete a **delivery or pickup** booking with correct pricing and availability.
3. A customer receives a **push notification** on booking status changes and tapping it deep-links to the booking.
4. A pickup customer can display a **full-screen QR** of their pickup code.
5. A customer can view **My Bookings** and **live delivery tracking**.
6. The web app shows **no regression** after the `@tla/core` extraction.
7. `profiles` RLS is enabled and signup role is server-enforced (security gate cleared).
