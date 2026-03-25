import { describe, expect, it } from 'vitest';
import { calculateUkLatePaymentClaim, getUkFixedCompensation } from '../src/core/interest-engine/uk';

describe('UK late payment engine', () => {
  it('returns zero interest/fees when not late', () => {
    const result = calculateUkLatePaymentClaim({
      principal: 1200,
      dueDate: '2026-03-25',
      asOfDate: '2026-03-25',
      baseRatePercent: 5
    });

    expect(result.daysLate).toBe(0);
    expect(result.interest).toBe(0);
    expect(result.fixedCompensation).toBe(0);
    expect(result.additionalRecovery).toBe(0);
    expect(result.totalClaim).toBe(1200);
  });

  it('calculates statutory-style interest + fixed compensation when overdue', () => {
    const result = calculateUkLatePaymentClaim({
      principal: 1200,
      dueDate: '2026-03-01',
      asOfDate: '2026-03-31',
      baseRatePercent: 5
    });

    expect(result.daysLate).toBe(30);
    expect(result.annualRatePercent).toBe(13);
    expect(result.interest).toBe(12.82);
    expect(result.fixedCompensation).toBe(70);
    expect(result.additionalRecovery).toBe(82.82);
    expect(result.totalClaim).toBe(1282.82);
  });

  it('uses fixed compensation tiers', () => {
    expect(getUkFixedCompensation(999)).toBe(40);
    expect(getUkFixedCompensation(1000)).toBe(70);
    expect(getUkFixedCompensation(9999)).toBe(70);
    expect(getUkFixedCompensation(10000)).toBe(100);
  });
});
