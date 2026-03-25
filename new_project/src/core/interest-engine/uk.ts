export type UkInterestInput = {
  principal: number;
  dueDate: string; // YYYY-MM-DD
  asOfDate: string; // YYYY-MM-DD
  baseRatePercent: number; // BoE base rate at calc time
};

export type UkInterestBreakdown = {
  daysLate: number;
  annualRatePercent: number;
  interest: number;
  fixedCompensation: number;
  additionalRecovery: number;
  totalClaim: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getUkFixedCompensation(principal: number): number {
  if (principal < 1000) return 40;
  if (principal < 10000) return 70;
  return 100;
}

export function calculateUkLatePaymentClaim(input: UkInterestInput): UkInterestBreakdown {
  const principal = input.principal;
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error('principal must be > 0');
  }

  const due = new Date(`${input.dueDate}T00:00:00Z`);
  const asOf = new Date(`${input.asOfDate}T00:00:00Z`);
  if (Number.isNaN(due.getTime()) || Number.isNaN(asOf.getTime())) {
    throw new Error('Invalid dueDate/asOfDate');
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((asOf.getTime() - due.getTime()) / msPerDay);
  const daysLate = Math.max(0, diffDays);

  const annualRatePercent = input.baseRatePercent + 8;
  const interest = daysLate === 0
    ? 0
    : round2((principal * (annualRatePercent / 100) * daysLate) / 365);

  const fixedCompensation = daysLate === 0 ? 0 : getUkFixedCompensation(principal);
  const additionalRecovery = round2(interest + fixedCompensation);
  const totalClaim = round2(principal + additionalRecovery);

  return {
    daysLate,
    annualRatePercent,
    interest,
    fixedCompensation,
    additionalRecovery,
    totalClaim
  };
}
