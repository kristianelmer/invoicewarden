# InvoiceWarden Wireframe Map (v1)

Last updated: 2026-03-25

## 1) Landing Page Wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│ NAV: Logo | Product | Pricing | Login | Start Trial             │
├──────────────────────────────────────────────────────────────────┤
│ HERO                                                             │
│ Recover unpaid invoices with legally compliant interest claims   │
│ [Start recovering interest] [See how it works]                  │
├──────────────────────────────────────────────────────────────────┤
│ HOW IT WORKS (4 steps)                                           │
│ 1 Add invoice -> 2 Calculate legal amounts ->                    │
│ 3 Send claim-ready reminders -> 4 Reconcile payment              │
├──────────────────────────────────────────────────────────────────┤
│ TRUST BLOCK                                                      │
│ - Transparent calculations                                       │
│ - Audit trail for every action                                   │
│ - Jurisdiction-specific logic                                    │
├──────────────────────────────────────────────────────────────────┤
│ PRICING + CTA                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## 2) App Shell Wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│ Top bar: InvoiceWarden | Workspace | Profile                     │
├───────────────┬──────────────────────────────────────────────────┤
│ Side nav      │ Content                                           │
│ - Invoices    │ KPI STRIP                                         │
│ - Customers   │ [Outstanding Principal] [Interest] [Fees] [Total] │
│ - Activity    │                                                   │
│ - Settings    │ Main panel changes by selected route              │
└───────────────┴──────────────────────────────────────────────────┘
```

## 3) Invoices List Wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│ Filters: [All] [Due] [Overdue] [Paid] [Failed send]             │
│ Search: [invoice/customer]                  [Create invoice]      │
├──────────────────────────────────────────────────────────────────┤
│ Invoice | Customer | Due | Principal | Interest | Fees | Total | │
│ Status | Last Reminder | Actions                                 │
├──────────────────────────────────────────────────────────────────┤
│ INV-1001 | Acme Ltd | 2026-03-01 | £1200 | £38.40 | £40 | £1278 │
│ OVERDUE | Sent 2d ago | [View] [Send now] [Mark paid]            │
└──────────────────────────────────────────────────────────────────┘
```

## 4) Invoice Detail Wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│ Header: INV-1001 | Acme Ltd | Overdue                            │
├───────────────────────────────┬──────────────────────────────────┤
│ Legal Amount Breakdown        │ Timeline                          │
│ Principal: £1200              │ - Invoice created                │
│ Interest:  £38.40             │ - Reminder scheduled             │
│ Fee:       £40.00             │ - Reminder sent                  │
│ Total:     £1278.40           │ - Delivery confirmed/failed      │
│ [How calculated]              │ - Payment events                 │
├───────────────────────────────┴──────────────────────────────────┤
│ Actions: [Send now] [Pause reminders] [Mark paid]                │
└──────────────────────────────────────────────────────────────────┘
```

## 5) Onboarding Flow Wireframe

```text
Step 1: Business details + Jurisdiction (UK active)
Step 2: Add first customer
Step 3: Add first invoice
Step 4: Review legal amount preview + reminder schedule
Step 5: Enable automation + see first dashboard
```

## 6) Build Order Alignment (UI)

1. App shell + invoice list skeleton
2. Create customer/invoice forms
3. Legal amount breakdown panel
4. Activity timeline
5. Reminder controls + status states
