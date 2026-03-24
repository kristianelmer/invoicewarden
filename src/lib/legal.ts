export type Jurisdiction = "UK" | "US_NY" | "US_CA";

type LegalEngineInput = {
  amountCents: number;
  currency: string;
  dueDate: string;
  jurisdiction: Jurisdiction;
  now?: Date;
  projectCompletedAt?: string | null;
  servicesRenderedAt?: string | null;
  contractRequestedRefused?: boolean;
};

export type LegalAssessment = {
  jurisdiction: Jurisdiction;
  lawLabel: string;
  escalationBody: string;
  triggerDate: string;
  triggered: boolean;
  daysLate: number;
  mode: "reminder" | "enforcement";
  dailyInterestCents: number;
  statutoryInterestCents: number;
  fixedRecoveryFeeCents: number;
  litigationExposureCents: number;
  administrativeFineCents: number;
  updatedTotalCents: number;
};

const BOE_BASE_RATE = 0.045;
const UK_TOTAL_RATE = 0.08 + BOE_BASE_RATE;
const ENFORCEMENT_START_DAYS_LATE = 7;
// California SB 988: +$1,000 if written contract was requested and refused.
const CA_CONTRACT_REFUSAL_FINE_CENTS = 100_000;

const DAY_MS = 24 * 60 * 60 * 1000;

function atUtcDay(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const d = atUtcDay(dateString);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

function elapsedDaysInclusive(startDate: string, now: Date) {
  const start = atUtcDay(startDate).getTime();
  const today = atUtcDay(now.toISOString().slice(0, 10)).getTime();
  if (today < start) return 0;
  return Math.floor((today - start) / DAY_MS) + 1;
}

function ukFixedFeeCents(amountCents: number) {
  const pounds = amountCents / 100;
  if (pounds < 1000) return 4000;
  if (pounds <= 9999) return 7000;
  return 10000;
}

export function assessLegalExposure(input: LegalEngineInput): LegalAssessment {
  const now = input.now ?? new Date();
  const triggerCandidates: string[] = [];

  if (input.jurisdiction === "UK") {
    triggerCandidates.push(addDays(input.dueDate, 1));
  }

  if (input.jurisdiction === "US_NY") {
    triggerCandidates.push(addDays(input.dueDate, 1));
    if (input.projectCompletedAt) {
      triggerCandidates.push(addDays(input.projectCompletedAt, 30));
    }
  }

  if (input.jurisdiction === "US_CA") {
    if (input.servicesRenderedAt) {
      triggerCandidates.push(addDays(input.servicesRenderedAt, 30));
    } else {
      triggerCandidates.push(addDays(input.dueDate, 1));
    }
  }

  const triggerDate = triggerCandidates.sort()[0] ?? addDays(input.dueDate, 1);
  const daysLate = elapsedDaysInclusive(triggerDate, now);
  const triggered = daysLate > 0;

  let lawLabel = "";
  let escalationBody = "";
  let dailyInterestCents = 0;
  let statutoryInterestCents = 0;
  let fixedRecoveryFeeCents = 0;
  let litigationExposureCents = 0;
  let administrativeFineCents = 0;

  if (input.jurisdiction === "UK") {
    lawLabel = "UK Late Payment of Commercial Debts (Interest) Act 1998";
    escalationBody = "the Small Business Commissioner";
    if (triggered) {
      dailyInterestCents = Math.round((input.amountCents * UK_TOTAL_RATE) / 365);
      statutoryInterestCents = dailyInterestCents * daysLate;
      fixedRecoveryFeeCents = ukFixedFeeCents(input.amountCents);
    }
  }

  if (input.jurisdiction === "US_NY") {
    lawLabel = "New York Freelance Isn't Free Act (NY Labor Law § 191-d)";
    escalationBody = "the New York Department of Labor";
    if (triggered) {
      litigationExposureCents = input.amountCents * 2;
    }
  }

  if (input.jurisdiction === "US_CA") {
    lawLabel = "California Freelance Worker Protection Act (SB 988)";
    escalationBody = "the California Labor Commissioner";
    if (triggered) {
      litigationExposureCents = input.amountCents * 2;
      if (input.contractRequestedRefused) {
        administrativeFineCents = CA_CONTRACT_REFUSAL_FINE_CENTS;
      }
    }
  }

  const updatedTotalCents =
    input.amountCents +
    statutoryInterestCents +
    fixedRecoveryFeeCents +
    litigationExposureCents +
    administrativeFineCents;

  return {
    jurisdiction: input.jurisdiction,
    lawLabel,
    escalationBody,
    triggerDate,
    triggered,
    daysLate,
    mode: triggered && daysLate >= ENFORCEMENT_START_DAYS_LATE ? "enforcement" : "reminder",
    dailyInterestCents,
    statutoryInterestCents,
    fixedRecoveryFeeCents,
    litigationExposureCents,
    administrativeFineCents,
    updatedTotalCents,
  };
}

export function formatMoney(cents: number, currency: string) {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function buildEnforcementEmail(params: {
  invoiceNumber: string;
  clientName: string;
  freelancerName: string;
  paymentUrl?: string | null;
  assessment: LegalAssessment;
  currency: string;
}) {
  const { assessment } = params;

  const subject = `NOTICE OF STATUTORY INTEREST: Invoice ${params.invoiceNumber} - ${params.freelancerName}`;

  const detailRows: string[] = [];

  if (assessment.statutoryInterestCents > 0 || assessment.dailyInterestCents > 0) {
    detailRows.push(
      `Statutory Interest: ${formatMoney(assessment.statutoryInterestCents, params.currency)} (Accruing daily at ${formatMoney(assessment.dailyInterestCents, params.currency)}/day)`
    );
  }

  if (assessment.fixedRecoveryFeeCents > 0) {
    detailRows.push(
      `Fixed Debt Recovery Fee: ${formatMoney(assessment.fixedRecoveryFeeCents, params.currency)}`
    );
  }

  if (assessment.litigationExposureCents > 0) {
    detailRows.push(
      `Statutory Damages Exposure: ${formatMoney(assessment.litigationExposureCents, params.currency)}`
    );
  }

  if (assessment.administrativeFineCents > 0) {
    detailRows.push(
      `Administrative Fine Exposure: ${formatMoney(assessment.administrativeFineCents, params.currency)}`
    );
  }

  if (detailRows.length === 0) {
    detailRows.push(`Current balance exposure: ${formatMoney(assessment.updatedTotalCents, params.currency)}`);
  }

  const lines = [
    `Dear ${params.clientName},`,
    "",
    `Our records indicate that Invoice ${params.invoiceNumber} is now ${assessment.daysLate} days overdue.`,
    `As per the ${assessment.lawLabel}, we have updated your invoice to include:`,
    "",
    ...detailRows.map((row, index) => `${index + 1}. ${row}`),
  ];

  lines.push(
    "",
    `Updated Total Due: ${formatMoney(assessment.updatedTotalCents, params.currency)}`,
    "",
    `Please be advised that continued non-payment may result in formal escalation to ${assessment.escalationBody}.`,
    "To freeze further accrual and avoid escalation, settle the updated balance immediately:",
    params.paymentUrl || "https://invoicewarden.com/dashboard",
    "",
    "This is an automated notice from InvoiceWarden Compliance."
  );

  return { subject, text: lines.join("\n") };
}
