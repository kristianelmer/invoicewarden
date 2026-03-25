# InvoiceWarden Design Spec (v1)

Last updated: 2026-03-25

## 1) Design Principles

1. Legal and financial credibility first
2. Clarity over personality
3. Data density without clutter
4. Explainable numbers everywhere
5. Fast operational workflows

## 2) Brand Direction

- Personality: precise, calm, authoritative
- Voice: factual, transparent, non-salesy
- Avoid: hype language, playful visual metaphors, bright startup gradients

## 3) Visual Tokens

### Color System

- `bg.base`: `#0B1020` (deep slate)
- `bg.surface`: `#121A2B`
- `bg.surfaceAlt`: `#182236`
- `text.primary`: `#E8EEF9`
- `text.secondary`: `#AAB7CF`
- `border.default`: `#25324A`

- `brand.primary`: `#4D7CFE`
- `brand.primaryHover`: `#3E69E6`
- `brand.subtle`: `#243A73`

- `status.overdue`: `#F59E0B`
- `status.paid`: `#22C55E`
- `status.failed`: `#EF4444`
- `status.pending`: `#60A5FA`

### Typography

- Font: Inter (fallback: system-ui)
- Sizes:
  - `display`: 40/48
  - `h1`: 32/40
  - `h2`: 24/32
  - `h3`: 20/28
  - `body`: 16/24
  - `small`: 14/20
  - `mono`: 13/18 (for invoice refs)

### Spacing + Radius + Elevation

- Spacing scale: `4, 8, 12, 16, 24, 32, 40`
- Border radius: `8` (controls), `12` (cards), `16` (modals)
- Shadows: subtle only; rely on contrast + borders primarily

## 4) Information Architecture (App)

Primary nav:
1. Invoices (default)
2. Customers
3. Activity
4. Settings

Settings (v1):
- Jurisdiction (UK active)
- Business identity
- Reminder templates
- Billing

## 5) Core Screens

### A) Landing
- Hero: legal-interest value proposition
- How it works (4-step)
- Trust block: compliance + audit trail + transparent calculations
- Pricing block
- CTA: "Start recovering interest"

### B) Dashboard / Invoices (Primary)
- KPI strip:
  - Total outstanding principal
  - Accrued interest
  - Fees
  - Total claimable amount
- Filter chips: All / Due / Overdue / Paid / Failed send
- Table columns:
  - Invoice #
  - Customer
  - Due date
  - Principal
  - Interest
  - Fees
  - Total claim
  - Reminder status
  - Last action

### C) Invoice Detail
- Breakdown card:
  - Principal
  - Interest formula + period
  - Fixed fee (if applicable)
  - Total due
- Timeline:
  - Invoice created
  - Reminder schedule points
  - Sent/failed events
  - Payment events
- Actions:
  - Send now
  - Mark paid
  - Pause reminders

### D) Onboarding Flow
1. Business + jurisdiction
2. Create customer
3. Create invoice
4. Review legal amount preview
5. Enable reminders

## 6) Component Library (v1)

### Must-have components
- `AppShell`
- `TopNav`
- `KpiCard`
- `StatusPill`
- `DataTable`
- `CurrencyCell`
- `BreakdownCard`
- `TimelineEvent`
- `PrimaryButton / SecondaryButton / DangerButton`
- `EmptyState`

### Status Pills
- Overdue = amber
- Paid = green
- Failed = red
- Pending = blue

## 7) Interaction Rules

- All money values shown with currency symbol + locale format
- Any legal calculation displays a "How calculated" tooltip
- Destructive actions require explicit confirmation
- Retry actions are idempotent-safe and visually labeled

## 8) Accessibility Baseline

- Minimum contrast WCAG AA
- Keyboard navigable table actions
- Visible focus rings
- ARIA labels for status and action controls

## 9) Design-Dev Handoff Rules

- No new visual style experiments during slice implementation
- New components must map to business value in current slice
- Keep Figma/design updates synchronized with this file

## 10) Out of Scope (v1)

- Multi-jurisdiction visual complexity in production UI
- Advanced customization themes
- Marketing animation-heavy landing page
