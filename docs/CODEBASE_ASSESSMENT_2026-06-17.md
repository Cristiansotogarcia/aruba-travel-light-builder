# Codebase Assessment — Travel Light Aruba (`aruba-travel-light-builder`)

**Date:** 2026-06-17
**Branch assessed:** `test_environment` @ `a235701`
**Stack:** React 19.2 · Vite 5.4 · TypeScript · Supabase (Postgres + Edge Functions) · TanStack Query v5 · shadcn/ui · Tailwind 3 · Express prerender server
**Scope:** `src/` — 391 TS/TSX files, ~46,226 LOC.
**Method:** Read-only multi-agent audit (5 parallel domains) + Context7 verification of Supabase / TanStack Query / React 19 / TypeScript best practices. **No code was changed.** All findings are cited `file:line` and the highest-severity items were re-verified by hand.

> **Status of the question "Is there a Lovable tagger still active?"** — **No.** The `vite-plugin`/`componentTagger` is fully gone from `vite.config.ts`, `package.json`, and `index.html`. The only residue is a stale `lovable-tagger` node in `package-lock.json` and verbatim Lovable boilerplate in `README.md`. See §6.

---

## 1. Executive Summary

The **customer-facing core is genuinely built and wired end-to-end** (browse → cart → book → confirm → email/notify), and so are the **driver/delivery and accounting back-offices**. The architecture has real strengths: route-level lazy loading, an elaborate Vite chunking strategy, server-side role checks in the privileged Edge Functions, and parameterized Supabase queries (no SQL injection).

However, the project is **not handoff-ready**. There are **four Critical/High security issues** that must be fixed before this repo goes to XA or production, a **build that silently compiles with all TypeScript safety disabled** (masking 3 live type errors), a **failing test suite**, and a meaningful amount of **dead/duplicate code** (~2,000+ LOC) and **half-wired features** (admin booking runs on mock data; Stripe is schema-only).

### Severity scoreboard

| Area | Rating | Headline |
|---|---|---|
| **Security** | 🔴 Critical | Live secrets in `.env` + git history; fake DOMPurify; `profiles` RLS never enabled |
| **Wiring / integration** | 🟠 Fair | Public flow solid, but admin booking uses **mock equipment**; Stripe schema-only; ~12 orphaned components |
| **Code quality / junk** | 🟠 Fair | ~2,000 LOC dead code, 124 committed `.d.ts`, 235 `console.*`, 3 dead deps |
| **Performance** | 🟡 Good-with-gaps | Good lazy-loading base; admin lists unpaginated; images never lazy-loaded; no React Compiler |
| **Tooling / config** | 🔴 Poor | Build config has `strict:false`; ESLint not type-aware; failing tests; UTF-16 files |
| **Lovable remnants** | 🟢 Mostly clean | Lockfile entry + README boilerplate only |

### The 6 things to fix before any handoff (in order)

1. **Rotate every real secret** (Supabase service-role, Cloudflare token, Umami key) and **purge `.env` from git history** — they are recoverable from any clone. (§2.1, §2.2)
2. **Remove the fake-DOMPurify alias** so the real sanitizer resolves — current setup is a sitewide stored-XSS hole. (§2.3)
3. **Explicitly enable + lock down `profiles` RLS** and stop trusting a client-supplied `role` at signup. (§2.4)
4. **Turn TypeScript `strict` back on** in `tsconfig.app.json` and fix the resulting errors (3 live ones today). (§5.1)
5. **Fix the admin booking path to use real Supabase equipment**, not `mockEquipment`. (§3.2)
6. **Repair the test suite** (drifted Supabase mocks) and add a `typecheck` CI gate. (§5.4, §5.3)

---

## 2. Security (🔴 Critical)

> Verified by hand: the DOMPurify stub, the `.env` contents, the git history of `.env`, and the absence of any `profiles` RLS-enable statement.

### 2.1 — CRITICAL: Live secrets sit in the working-tree `.env`
`.env` contains **real, active** credentials (not placeholders):
- `SUPABASE_SERVICE_ROLE_KEY` **and a duplicate `VITE_SUPABASE_SERVICE_ROLE_KEY`** — this key **bypasses all Row-Level Security**.
- `VITE_CLOUDFLARE_API_TOKEN`, `VITE_CLOUDFLARE_ACCOUNT_ID`, `VITE_UMAMI_API_KEY`.
- (Stripe/Resend/Google keys are present but placeholder values.)

The `VITE_`-prefix on the service-role and Cloudflare keys is a loaded gun: **Vite inlines any `VITE_*` var into the client bundle.** Today nothing references `VITE_SUPABASE_SERVICE_ROLE_KEY` in `src/` (verified), so it isn't shipped yet — but one future `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` would publish a full RLS-bypass key to every browser. The legitimate scripts already read the non-`VITE_` `process.env.SUPABASE_SERVICE_ROLE_KEY` (`scripts/seed-users.ts:7`), so the `VITE_` copies are unnecessary.

**Fix:** Rotate the Supabase service-role key, Cloudflare API token, and Umami key now (assume compromised). Delete the `VITE_`-prefixed service-role/Cloudflare entries. Keep server-only secrets out of any repo-resident `.env` (use deploy env / secret manager).

### 2.2 — CRITICAL: `.env` was committed to git history
`.env` was tracked in commits **`7cb9884` ("Cloudflare installed")**, **`f95aa50`**, **`44e4d93`**, then removed in **`609cebf`**. The removal does **not** erase the secrets from history — `git show 7cb9884:.env` still yields an (older, possibly still-live) Cloudflare token + the anon key. Any clone, fork, or the planned XA mirror carries them permanently.

**Fix:** Treat every credential that ever appeared as compromised and rotate. Purge history with `git filter-repo` (or BFG) **before** handing the repo to anyone.

### 2.3 — CRITICAL: `dompurify` is aliased to a fake sanitizer
`src/lib/dompurify.ts` is a 10-line stub that only removes `<script>` tags:
```ts
sanitize(html) { const div=document.createElement('div'); div.innerHTML=html;
  div.querySelectorAll('script').forEach(s=>s.remove()); return div.innerHTML; }
```
It does **not** strip `onerror=`/`onload=`/`onclick=` handlers, `<iframe>`, `<svg>`, or `javascript:` URLs — so `<img src=x onerror=alert(1)>` passes straight through. The real `dompurify@3.3.0` is installed, but `vite.config.ts:19` and `tsconfig.json:29` **alias every `import 'dompurify'` to the stub.**

Every consumer is therefore unprotected, including the **sanitize-on-save** path in `ProductManagement.tsx:156` (malicious HTML is stored) and the many `dangerouslySetInnerHTML` render sites (`EquipmentCard.tsx:43/166/294`, `EquipmentItem.tsx:94/293`, `FeaturedProducts.tsx:68`, `ProductCard.tsx:24/45`). Authoring is admin-gated, but combined with §2.4 this is a viable **stored-XSS** chain reaching all public visitors.

**Fix:** Delete the alias in `vite.config.ts:19` and `tsconfig.json:29` and remove `src/lib/dompurify.ts`/`.d.ts` so genuine DOMPurify resolves; configure an allow-list; re-test all `dangerouslySetInnerHTML` sites.

### 2.4 — HIGH: `profiles` RLS never enabled + client-controlled role at signup
No migration runs `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY` (verified — the enable statements exist for `equipment`, `bookings`, etc., but **never `profiles`**). `20240619123456_create_rls_policies.sql:29` only *asserts in a comment* that RLS "is already enabled," and defines SELECT/UPDATE policies but **no INSERT `WITH CHECK`**. Meanwhile `signUp()` writes a **client-supplied `role`** straight into `profiles` (`useAuth.tsx:228-251`).

**Impact:** If RLS isn't enabled out-of-band in the Supabase dashboard, an anon client can read every user's email/role and self-insert a profile with `role:'Admin'` — full privilege escalation, since every other policy trusts `profiles.role`. Even if it *is* enabled in the dashboard, the security model depends on undocumented manual config that won't reproduce on a fresh `supabase db reset` for the handoff.

**Fix:** Add a migration that enables RLS on `profiles` with an INSERT `WITH CHECK (id = auth.uid() AND role = 'Customer')`, or move profile creation into a `SECURITY DEFINER` `handle_new_user` trigger that forces a non-privileged role. Never accept `role` from the client.

### 2.5 — HIGH: other security findings

| # | Finding | Location | Fix |
|---|---|---|---|
| a | Prerender server interpolates DB strings (title/description) into HTML **unescaped** → HTML/attribute injection to crawlers | `server.js`, `src/lib/prerender.ts:68-88` | HTML-escape all interpolated values; whitelist the slug |
| b | `react-router-dom` v6 carries **High** open-redirect / redirect-XSS advisories (runtime dep) | `npm audit`, `package.json` | `npm audit fix` / move toward patched line; re-test post-login `Navigate` |
| c | Edge fn stores **plaintext temp passwords** in `user_temp_passwords` | `admin-user-operations/index.ts:171-178` | Never persist plaintext; use a hashed one-time token, deliver out-of-band |
| d | `bookings` INSERT policy `WITH CHECK (true)` granted to `anon` → spam/DoS + notification flood | `20250131000000_guest_booking_system.sql:281` | Rate-limit/CAPTCHA; constrain the check; consider routing guest bookings via an Edge Function |
| e | Wildcard CORS `Access-Control-Allow-Origin: *` on all Edge Functions | `_shared/cors.ts`, `admin-user-operations/index.ts:5` | Restrict to known frontend origin(s) |
| f | Session in `sessionStorage`; route protection is client-only (`ProtectedRoute`) | `client.ts:14`, `ProtectedRoute.tsx` | Acceptable **only** if RLS is authoritative — so fix §2.4 |

**`npm audit`:** 27 total (2 critical, 15 high, 9 moderate). The 2 criticals are **dev-only** (`vitest`/`@vitest/ui`, `lovable-tagger`). Runtime (`--omit=dev`) leaves 15 (9 high) — `react-router-dom` is the real one; also `postcss`, `qs`, `ws`, `path-to-regexp`, `tar`.

### What is already correct (don't "fix" these)
- Browser client uses the **anon key only** (`client.ts:5-12`) — correct public-client pattern.
- `admin-user-operations` / `verify-password` Edge Functions keep the service-role key in **Deno env** and **verify the caller's role server-side** before privileged actions (`index.ts:27-80`) — the right architecture.
- Cloudflare token is proxied through an Edge Function, not embedded client-side.
- Parameterized `.eq()` queries (no SQL injection); no path traversal in `server.js`; no SSRF.

---

## 3. Wiring & Integration Completeness (🟠 Fair)

### Feature-area status

| Area | Status | Verdict |
|---|---|---|
| Routing (public + protected) | ✅ Wired | All registered routes resolve; role-gated. **2 pages orphaned** (PaymentSuccess/Error) |
| Public booking (Book/Cart) | ✅ Wired | UI → `useBooking` → `create_booking_with_items` RPC → email + admin notification |
| Cart | ✅ Wired | Real context, add/remove/qty, checkout → `/book` |
| Equipment browsing (public) | ✅ Wired | `getProducts()` from Supabase everywhere |
| Admin product/category mgmt | ✅ Wired | Full CRUD + CSV bulk import (papaparse) |
| Driver / delivery | ✅ Wired | Tasks, ETA, signature → storage → `complete_delivery_task` RPC, leaflet maps, public tracking |
| Accounting / invoices | ✅ Wired | Real queries, CSV export, payment records, fee calc |
| Auth | ✅ Wired | `useAuth` + `ProtectedRoute` + password-change gate + inactivity logout |
| **Admin booking create/edit** | ⚠️ **Broken** | Uses **`mockEquipment`**; writes mock IDs/prices into real `booking_items` |
| **Payments (Stripe)** | ❌ Stubbed | DB has stripe columns; only a manual admin-pasted payment link is wired |
| Cloudflare Images | ⚠️ Partial | Upload/list work (Edge-proxied); `getImageUrl()` returns a `ACCOUNT_ID_NEEDED` placeholder → broken `<img>` |
| Umami analytics | ⚠️ Partial | Live path works; duplicate `AnalyticsDashboard.tsx` is orphaned **and** would leak the API key client-side if mounted |

### 3.1 — Orphaned pages
`PaymentSuccess.tsx` and `PaymentError.tsx` are **not in any `<Route>`** (`src/App.tsx:23-40, 82-138`) — clearly the missing Stripe redirect targets.

### 3.2 — CRITICAL wiring defect: admin booking runs on mock data
`CreateBookingModal` (rendered in `BookingsList.tsx:341`, `calendar/DayPopupDialog.tsx:155`) sources its equipment dropdown **and pricing** from `src/data/mockEquipment.ts`, not Supabase:
- `CreateBookingModal.tsx:17` import; `:304` dropdown; `:92-94` price calc; `:136-141` writes `equipment_id`/`equipment_name`/`equipment_price` (mock IDs `'1'`–`'8'`) into the real `booking_items` table.
- Same pattern feeds the **live** `CompactEditBookingModal` via `edit-booking/useBookingEquipment.ts:3,18` and `EquipmentSelectionSection.tsx:6,35`.

**Impact:** admin-created/edited bookings reference equipment that doesn't exist in the real table, with stale prices; real products are unavailable in the admin dropdown. (Public booking is unaffected.)

### 3.3 — Stripe is schema-only
`types.ts` defines `payment_link_url`, `stripe_session_id`, `stripe_payment_intent_id`, `payment_records` — but no code creates a Stripe session. The only path is a manual admin link (`BookingConfirmationModal.tsx:174-188` → `send-payment-link-email`). The orphaned PaymentSuccess/Error pages are the missing half. **Schema is ahead of code.**

### 3.4 — Orphaned components (defined, never rendered)
`admin/EditBookingModal.tsx`, `admin/AdminDashboards.tsx` (+ the `ReportsDashboard.tsx` it renders), `admin/ReportsDashboardTest.tsx`, `admin/AdminSidebarDebug.tsx`, `admin/AnalyticsDashboard.tsx`, `booking/EquipmentSelection.tsx`, `booking/BookingStatusWorkflow.tsx`, `admin/CategoryManagement.tsx`, and **two of three** ErrorBoundary files (`components/ErrorBoundary.tsx`, `components/common/ErrorBoundary.tsx` — only `layout/ErrorBoundary.tsx` is used). Dead query layer: `lib/queries/equipment.ts` (zero importers; superseded by `queries/products.ts`). Orphaned hook: `hooks/useSEO.ts`.

### 3.5 — Env wiring
All `VITE_*` vars referenced in code exist in `.env.example`; no code reads a missing var. `CLOUDFLARE_*` correctly has no `VITE_` prefix (Edge-function-only).

---

## 4. Code Quality — Junk & Dead Code (🟠 Fair)

| # | Finding | Severity | Magnitude |
|---|---|---|---|
| 1 | **124 committed `.d.ts` build artifacts** in `src/` (only `components/**` is gitignored) | High | 124 files |
| 2 | **Orphaned files** never imported (incl. 2 debug/test scaffolds) | High | ~2,079 LOC across 9 files |
| 3 | **18 unused shadcn UI primitives** (e.g. `ui/form`, `chart`, `command`, `menubar` — app uses react-hook-form directly) | Medium | 18 files |
| 4 | **3 dead deps** — `@dnd-kit/core`, `/sortable`, `/utilities` (+ dead `vite.config.ts:83` chunk rule) | Medium | 3 packages |
| 5 | **235 `console.*` calls** (48 `console.log`) in prod paths | Medium | 235 sites |
| 6 | **Duplicated code** — 3 ErrorBoundaries, 2 EditBookingModals, 2 AdminSidebars, 3 Cloudflare services, 2 perf utils | Medium | ~6 clusters |
| 7 | Commented-out CVA blocks left in UI primitives | Low | ~130 lines |
| 8 | AI-boilerplate comments (`edit-booking/types.ts:4-28` "This file can define…/Example:") | Low | ~10 sites |
| 9 | 1 TODO, 2 empty catch blocks (`useInactivityLogout.ts:36,58`), 0 `debugger`, 0 empty files | Low | minor |

**Notable `console.log` leak:** `hooks/useAuth.tsx` logs session/profile/permission internals at ~13 sites (lines 98–258); `pages/Login.tsx:27-75` logs the login flow incl. redirect URLs. Strip these.

**Highest-value cleanups:** delete the 9 orphaned files (~2,079 LOC, incl. `AdminSidebarDebug.tsx` and `ReportsDashboardTest.tsx` debug scaffolds shipping to prod); untrack the 124 `.d.ts`; remove the `@dnd-kit` deps.

---

## 5. Tooling, Config & Tests (🔴 Poor)

### 5.1 — TypeScript strictness is OFF in the config that actually builds
Two contradictory configs. The strict-looking `tsconfig.json` (root) is a project-reference shell; the config the app/IDE uses, **`tsconfig.app.json:18-22`, explicitly disables every safety flag:**
```jsonc
"strict": false,
"noImplicitAny": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noFallthroughCasesInSwitch": false
```
Implicit `any` and unchecked null access compile silently. **This is the single most important fix for enterprise/XA standards.**

### 5.2 — 3 live type errors hidden by the loose config
`npx tsc --noEmit -p tsconfig.app.json` → **3 errors**, all in `src/components/common/dynamic/DynamicMap.tsx:17,19,23` (`center`/`attribution`/`radius` props) — **react-leaflet v5** type breakages. Invisible today because `vite build` (esbuild/SWC) does no typechecking.

### 5.3 — ESLint is weak
`eslint.config.js:26` disables `@typescript-eslint/no-unused-vars` project-wide; the config is **not type-aware** (`recommended`, not `recommendedTypeChecked`, no `parserOptions.project`). `npm run lint` → 8 errors / 2 warnings, including **4× "File appears to be binary"** on the Supabase type files (they're UTF-16 — see §5.5), so the largest generated files go entirely unlinted.

### 5.4 — Test suite is failing
14 test files. `npx vitest run` → **5 tests fail, 4 files red, 2 unhandled rejections**, ~295s runtime. Root cause confirmed: the Supabase client **mock doesn't support chained `.order().order()`** (`SubGroupOrderSettings.tsx:30` throws on mount) — the mock has drifted from the real query-builder API. The `lib/*` logic tests are genuine; the component tests are currently a red, brittle net. **No `typecheck` script exists** in `package.json`.

### 5.5 — Repo hygiene
- **124 tracked `.d.ts` artifacts** under `src/` (committed before the ignore rule; can shadow real types).
- **4 Supabase type files are UTF-16 LE** (`integrations/supabase/types.ts`, `types.d.ts`, `types/supabase.ts`, `supabase.d.ts`) — why ESLint skips them as "binary." Re-encode to UTF-8.
- **Stale/contradictory docs:** `tasks.json` (`lastUpdated: 2023-10-25`), `project-plan.md` & `Agents.MD` (Jun 2025, multi-agent role fiction) contradict the real, current `docs/superpowers/{plans,specs}/` (2026-06) and the git history.

### 5.6 — Dependency hygiene
Lockfile in sync; `dist/` not committed (good). But `@supabase/supabase-js` is ~30 minors behind (2.78 → 2.108) and the Supabase CLI is old — **catch these up** (meaningful for a Supabase app). `@tailwindcss/line-clamp` is obsolete (built into Tailwind 3.3+); `dotenv` should move to devDependencies. Major holds (router 7, tailwind 4, zod 4, vite 8) are fine to defer.

---

## 6. Lovable Remnants (🟢 Mostly clean)

**Active tagger: none.** No `componentTagger`/`gpteng`/`gptengineer` in `vite.config.ts`, `package.json`, `index.html`, or `src` (verified by grep). `index.html` uses Umami + a Supabase favicon — no Lovable badge or script.

**Residue (cosmetic):**
1. `package-lock.json:95,7147` — a stale `lovable-tagger` node (`^1.1.7` decl / `1.1.11` resolved). Not installed via `package.json`; it's also the source of one `npm audit` dev-only critical. **Fix:** regenerate the lockfile (`rm package-lock.json && npm install`).
2. `README.md:11-15,65,71-73` — verbatim Lovable boilerplate with "Lovable" find-replaced to "Travel Light Aruba builder" ("make changes in the online editor", "Share → Publish", a dead `/docs/custom-domain` link). **Fix:** rewrite with real local-dev + XA deploy instructions.

---

## 7. Performance & Efficiency (🟡 Good base, clear wins)

> Chunk sizes measured from the committed `dist/assets` (uncompressed).

### Top optimizations

| # | Optimization | Impact | Effort | Evidence |
|---|---|---|---|---|
| 1 | **Lazy-load `Admin.tsx` heavy sections** — recharts (500 KB) + leaflet (154 KB) load on first admin paint | High | Low | `Admin.tsx:1-19` static-imports all 18 sections; `:14` `EnhancedReportsDashboard`, `:93` `DriverTasks` |
| 2 | **Swap raw `<img>` → existing `OptimizedImage`/`GalleryImage`** — 0 of 10 images use `loading="lazy"`; the optimization layer already exists but is **never imported** | High | Low | `EquipmentCard.tsx:126,274,286`; `FeaturedProducts.tsx:44`; `OptimizedImage.tsx`/`utils/imageOptimization.ts` unused |
| 3 | **Paginate admin lists** — all fetch unbounded rows + `select('*')` | High | Med | `BookingsList.tsx:39`, `CustomersList.tsx:67`, `DriverTasks.tsx:158`, `ProductManagement.tsx:102` — no `.range()`/`.limit()` |
| 4 | **Global `staleTime`/`gcTime`** on the QueryClient (default is 0 → refetch storms) | Med | Low | `App.tsx:46-52` sets only `refetchOnWindowFocus:false` |
| 5 | Drop `refetchOnMount/refetchOnWindowFocus:true` override that defeats caching | Med | Low | `FeaturedProducts.tsx:13-14` |
| 6 | **Adopt the React 19 Compiler** instead of hand-memoizing | Med | Med | no `babel-plugin-react-compiler`; SWC only |
| 7 | Memoize `EquipmentCard` + extract memoized list rows | Med | Med | `EquipmentCard.tsx:37` not memoized, rendered in nested `.map()` (`Equipment.tsx:284`) |
| 8 | Stop refetching the whole list on every realtime event | Med | Med | `BookingsList.tsx:104-139`, `DriverTasks.tsx:288-294` |

**What's already good:** route-level `React.lazy` for all 21 pages (`App.tsx:23-40`); the `manualChunks` + `modulePreload` filter in `vite.config.ts`; the 1.1 MB MD editor is correctly lazy and admin-only (public visitors don't pay for it); availability uses one RPC, not per-item queries.

**Notable measured chunks:** `md-editor` 1,106 KB, `recharts-vendor` 500 KB, `admin-core` 286 KB, `react-vendor` 195 KB, `maps-lib` 154 KB. Item #1 removes ~650 KB from the admin first-paint path. Note `DynamicMap.tsx` is **not** actually dynamic — it does a top-level `import 'react-leaflet'` + leaflet CSS, so it's statically linked into `admin-core`; make it truly `React.lazy` like `DynamicEditor.tsx` already is.

---

## 8. Recommended Action Plan (sequenced)

### Phase 0 — Security & handoff blockers (do first)
1. Rotate Supabase service-role key, Cloudflare token, Umami key; remove `VITE_`-prefixed secret copies. (§2.1)
2. `git filter-repo`/BFG to purge `.env` from history; re-verify. (§2.2)
3. Remove the DOMPurify alias (`vite.config.ts:19`, `tsconfig.json:29`) + stub file; bump `dompurify`; re-test `dangerouslySetInnerHTML` sites. (§2.3)
4. Migration: enable RLS on `profiles` + INSERT `WITH CHECK`; stop trusting client `role`. (§2.4)
5. HTML-escape prerender output (§2.5a); `npm audit fix` for `react-router-dom` (§2.5b); stop storing plaintext temp passwords (§2.5c); restrict Edge-function CORS (§2.5e).

### Phase 1 — Correctness & build integrity
6. Fix admin booking to use real Supabase equipment (§3.2).
7. Re-enable TS `strict` in `tsconfig.app.json`; fix the 3 DynamicMap errors; add `"typecheck": "tsc --noEmit -p tsconfig.app.json"` to scripts + CI. (§5.1, §5.2, §5.3)
8. Repair the Supabase test mock (`.order().order()`) and get the suite green. (§5.4)
9. Decide Stripe: finish it (wire PaymentSuccess/Error + session creation) or remove the dead schema/pages. (§3.3)

### Phase 2 — Cleanup & hygiene
10. Delete the 9 orphaned files + dead `queries/equipment.ts`; remove `@dnd-kit` deps + dead chunk rule. (§4)
11. Untrack the 124 `.d.ts`; re-encode the 4 UTF-16 files to UTF-8; widen `.gitignore`. (§5.5)
12. Regenerate `package-lock.json` (drops `lovable-tagger`); rewrite `README.md`; delete/replace stale `tasks.json`/`project-plan.md`/`Agents.MD`. (§6, §5.5)
13. Strip `console.*` from `useAuth`/`Login` and other prod paths; make ESLint type-aware. (§4, §5.3)
14. Catch up `@supabase/supabase-js` + CLI; drop `@tailwindcss/line-clamp`; move `dotenv` to devDeps. (§5.6)

### Phase 3 — Performance
15. Lazy-load `Admin.tsx` heavy sections + make `DynamicMap` truly lazy (~650 KB off admin first paint). (§7 #1)
16. Adopt `OptimizedImage`/`GalleryImage` on the public grids (lazy + responsive + WebP, near-zero risk). (§7 #2)
17. Global `staleTime`/`gcTime`; drop `FeaturedProducts` refetch overrides; column-scoped `select` + `.range()` pagination on admin lists. (§7 #3–5)
18. Pilot the React 19 Compiler; memoize leaf cards. (§7 #6–7)

---

## Appendix — Method & confidence

- Five independent read-only agents (junk/dead-code, security, wiring, performance, tooling) ran in parallel on Opus; library best-practices (Supabase RLS / service-role handling, TanStack Query v5 caching, React 19 Compiler, TypeScript strictness) were verified via Context7.
- The four cornerstone security findings (§2.1–2.4) were re-verified by hand against the live files and git history.
- This document reflects the repo at `a235701` on branch `test_environment`. No files were modified during the assessment.
</content>
</invoke>
