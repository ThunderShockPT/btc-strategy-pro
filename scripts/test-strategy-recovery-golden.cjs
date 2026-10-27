'use strict';
// R1 historical reference: not an executable trading recommendation or Kraken liquidation oracle.
const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../policies/profiles-beta-20261021.json');

const weights = [0.2, 0.3, 0.5];
const classic = (first = 82000, cycleGap = 1000, reinforcementGap = 8000, cycles = 5) =>
  Array.from({ length: cycles }, (_, i) => {
    const start = first - i * cycleGap;
    return [start, start - reinforcementGap, start - 2 * reinforcementGap];
  });
const expectedOriginal = [
  [82000, 74000, 66000], [81000, 73000, 65000],
  [80000, 72000, 64000], [79000, 71000, 63000],
  [78000, 70000, 62000],
];
const expectedShifted = [
  [80000, 72000, 64000], [79000, 71000, 63000],
  [78000, 70000, 62000], [77000, 69000, 61000],
  [76000, 68000, 60000],
];
const avgEntry = (prices, amounts) => {
  const nominal = amounts.reduce((a, b) => a + b, 0);
  const btc = amounts.reduce((a, amount, i) => a + amount / prices[i], 0);
  return nominal / btc;
};

test('original Demo A-E uses first-entry -1000 USD and reinforcements -8000 USD', () => {
  assert.deepEqual(classic(), expectedOriginal);
});
test('translation to 80000 USD reproduces historical ladder without silently changing rules', () => {
  assert.deepEqual(classic(80000), expectedShifted);
  assert.equal(expectedShifted[4][2], 60000);
});
test('20/30/50 nominal allocations are 200/300/500 for a 1000 USD cycle', () => {
  assert.deepEqual(weights.map(w => w * 1000), [200, 300, 500]);
});
test('weighted average prices and phased sell targets match the archived Demo', () => {
  const entry = expectedOriginal[0];
  const a1 = avgEntry(entry.slice(0, 1), [200]);
  const a2 = avgEntry(entry.slice(0, 2), [200, 300]);
  const a3 = avgEntry(entry, [200, 300, 500]);
  assert.equal(Number(a1.toFixed(2)), 82000);
  assert.equal(Number(a2.toFixed(2)), 77005.08);
  assert.equal(Number(a3.toFixed(2)), 71079.09);
  assert.deepEqual([a1 + 1500, a2 + 2500, a3 + 3500].map(x => Number(x.toFixed(2))),
    [83500, 79505.08, 74579.09]);
});
test('approved profile distances are risk stress references, NOT automatically purchase levels', () => {
  assert.equal(policy.referenceDistancesApprovedUSD.balanced, '20000');
  assert.equal(policy.referenceDistancesApprovedUSD.safe, '40000');
  assert.equal(policy.referenceDistancesApprovedUSD.risky, '10000');
  assert.equal(80000 - Number(policy.referenceDistancesApprovedUSD.balanced), 60000);
});
test('diagnostic: current V20 0.3% / 1.5% policy produces much more concentrated levels', () => {
  const profile = policy.parameters.profiles.balanced;
  const first = 80000;
  const cycleGap = first * Number(profile.cycleSpacingFraction);
  const reinforcementGap = first * Number(profile.reinforcementFraction);
  const current = classic(first, cycleGap, reinforcementGap);
  assert.equal(cycleGap, 240);
  assert.equal(reinforcementGap, 1200);
  assert.equal(current[4][2], 76640);
  assert.notDeepEqual(current, expectedShifted);
  // This test documents the observed mismatch; it does not authorize replacing policy automatically.
});
