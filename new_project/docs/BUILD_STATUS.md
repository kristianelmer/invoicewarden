# Build Status

Last updated: 2026-04-02

## Completed
- Slice 4 (manual fallback + observability): Added `POST /api/invoices/[id]/mark-paid` manual paid fallback with `invoice_marked_paid_manual` event logging, invoice action button, and runbook hints in invoices/activity UI.
- IW-9003/9004 (extended): Stripe reconciliation path added via `/api/stripe/webhook` + invoice persistence (`stripe_checkout_session_id`, `stripe_payment_intent_id`, paid/split cents fields) + payment audit events.
- IW-7003 (partial): Ops runbook added for Stripe reconciliation deployment/verification/idempotency replay (`docs/OPS_RUNBOOK.md`).
- IW-6003 (partial): Activity dashboard now renders recent `invoice_events` timeline with payment amounts/fees.
- IW-9003/9004 (baseline): Invoice payment-session API added with Stripe Checkout + 20% fee on additional recovery only.
- IW-9002 (baseline): Stripe Connect onboarding + status API routes added.
- IW-9001 (baseline): Professional invoice PDF service + invoice PDF API route (`/api/invoices/[id]/pdf`) added.
- IW-2001: New project Next.js shell created with core routes and navigation.
- IW-2002 (baseline): Supabase auth path added (login page, dashboard route protection, signout endpoint, middleware session refresh).
- IW-3001: Customers API now persisted via Supabase (`customers` table contract) with validation + duplicate email conflict handling.
- IW-3002: Invoices API now persisted via Supabase (`invoices` table contract) with validation + duplicate invoice number conflict handling.
- IW-3003 (partial): Customers/Invoices UI forms and list views wired to APIs.
- IW-1003 (partial): Initial migration file created for `customers` and `invoices` with RLS and ownership policies.
- IW-1001 (baseline): UK legal rules calculation contract documented in `docs/LEGAL_RULES_UK.md`.
- IW-1002 (baseline): Executable UK engine tests added (`tests/uk-interest-engine.test.ts`, vitest configured).
- IW-4001 (baseline): UK interest engine scaffold implemented (`src/core/interest-engine/uk.ts`).

## Verification
- `npm test` ✅
- `npm run build` ✅

## Git Checkpoints
- `05f2441` chore: split repo into old_project archive and new_project rebuild workspace
- `727b657` feat: scaffold new_project app shell with auth and Supabase-backed customers/invoices

## Pending / Next
1. Verify real auth session CRUD against the now-applied remote migration.
2. Expand UK legal matrix with edge cases + legal wording compliance notes.
3. Implement IW-9001 professional PDF generation for reminder attachments.
4. Implement IW-9002/9003/9004 Stripe connect/payment + 20% additional-recovery split.
5. Add integration tests for APIs + auth edge cases.

## Migration Status
- `npx supabase link --project-ref iarsienmgydrnkwzqbxj` ✅
- `npx supabase db push` ✅
- Local migration history in `new_project/supabase/migrations` synced to include prior remote versions (2026032318... through 2026032409...).
- `20260325083000_core_customers_invoices.sql` updated to use `drop policy if exists` + `create policy` for compatibility.

## Risks / Notes
- Migration has not yet been applied to remote DB in this session.
- Current middleware checks for Supabase auth cookie presence before route access; route handlers also enforce user auth.
- Stripe/payment and PDF work still pending in this autonomous run.
