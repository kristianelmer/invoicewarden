# UK Legal Rules (v1 Assumptions for Engine)

Last updated: 2026-03-25

> This document defines the **v1 calculation contract** for UK late-payment recovery in InvoiceWarden.
> It should be reviewed against current legal guidance before production legal claims.

## Calculation Inputs

- `principal` (GBP)
- `dueDate` (YYYY-MM-DD)
- `asOfDate` (YYYY-MM-DD)
- `baseRatePercent` (Bank of England base rate at calculation time)

## Annual Interest Rate

`annualRatePercent = baseRatePercent + 8`

## Day Count

`daysLate = max(0, floor(asOfDate - dueDate in days))`

## Interest Formula

`interest = principal * (annualRatePercent / 100) * (daysLate / 365)`

Rounded to 2 decimals.

## Fixed Compensation (v1 tiers)

- principal < 1000 GBP -> 40 GBP
- 1000 <= principal < 10000 -> 70 GBP
- principal >= 10000 -> 100 GBP

Applied only when `daysLate > 0`.

## Additional Recovery + Total Claim

- `additionalRecovery = interest + fixedCompensation`
- `totalClaim = principal + additionalRecovery`

## Platform Revenue Basis (v1 requirement)

- `platformFeeBase = additionalRecovery`
- `platformFee = platformFeeBase * 0.20`

(Principal excluded from platform fee.)
