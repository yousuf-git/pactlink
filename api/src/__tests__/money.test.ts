import { describe, it, expect } from 'vitest';
import { recomputeTotals, tierGroupsMissingSelection } from '../utils/money.js';

type Line = Parameters<typeof recomputeTotals>[0]['lineItems'][number];

const standard = (over: Partial<Line> = {}): Line => ({
  qty: 1,
  unitPrice: 10000,
  taxRate: 0,
  type: 'standard',
  selected: true,
  tierGroup: null,
  ...over,
});

describe('recomputeTotals', () => {
  it('sums selected standard lines with per-line tax (integer cents)', () => {
    const t = recomputeTotals({
      lineItems: [standard({ qty: 2, unitPrice: 5000, taxRate: 10 })], // 10000 + 1000 tax
      depositType: 'percent',
      depositValue: 0,
    });
    expect(t.subtotal).toBe(10000);
    expect(t.taxTotal).toBe(1000);
    expect(t.total).toBe(11000);
  });

  it('excludes a deselected optional item from totals', () => {
    const selectedOn = recomputeTotals({
      lineItems: [standard(), standard({ type: 'optional', unitPrice: 4000, selected: true })],
      depositType: 'percent',
      depositValue: 0,
    });
    const selectedOff = recomputeTotals({
      lineItems: [standard(), standard({ type: 'optional', unitPrice: 4000, selected: false })],
      depositType: 'percent',
      depositValue: 0,
    });
    expect(selectedOn.subtotal).toBe(14000);
    expect(selectedOff.subtotal).toBe(10000);
  });

  it('enforces tiered mutual exclusivity (keeps first selected per group)', () => {
    const t = recomputeTotals({
      lineItems: [
        standard({ type: 'tiered', tierGroup: 'support', unitPrice: 3000, selected: true }),
        standard({ type: 'tiered', tierGroup: 'support', unitPrice: 9000, selected: true }),
      ],
      depositType: 'percent',
      depositValue: 0,
    });
    // Only the first tiered option counts.
    expect(t.subtotal).toBe(3000);
  });

  it('computes a percent deposit and balance', () => {
    const t = recomputeTotals({
      lineItems: [standard({ unitPrice: 100000 })],
      depositType: 'percent',
      depositValue: 30,
    });
    expect(t.total).toBe(100000);
    expect(t.depositAmount).toBe(30000);
    expect(t.balanceAmount).toBe(70000);
  });

  it('computes a fixed deposit clamped to the total', () => {
    const t = recomputeTotals({
      lineItems: [standard({ unitPrice: 50000 })],
      depositType: 'fixed',
      depositValue: 80000, // exceeds total → clamped
    });
    expect(t.total).toBe(50000);
    expect(t.depositAmount).toBe(50000);
    expect(t.balanceAmount).toBe(0);
  });

  it('returns zeros when nothing is selected', () => {
    const t = recomputeTotals({
      lineItems: [standard({ type: 'optional', selected: false })],
      depositType: 'percent',
      depositValue: 30,
    });
    expect(t).toEqual({ subtotal: 0, taxTotal: 0, total: 0, depositAmount: 0, balanceAmount: 0 });
  });
});

describe('tierGroupsMissingSelection', () => {
  it('flags a tier group with no selected option', () => {
    const missing = tierGroupsMissingSelection([
      standard({ type: 'tiered', tierGroup: 'support', selected: false }),
      standard({ type: 'tiered', tierGroup: 'support', selected: false }),
    ]);
    expect(missing).toEqual(['support']);
  });

  it('returns empty when every group has a selection', () => {
    const missing = tierGroupsMissingSelection([
      standard({ type: 'tiered', tierGroup: 'support', selected: true }),
      standard({ type: 'tiered', tierGroup: 'support', selected: false }),
    ]);
    expect(missing).toEqual([]);
  });
});
