import { AmountMath } from '@agoric/ertp';

/**
 * Compute per-place deposit transfers to move current balances toward a target allocation.
 * - targetAllocation values are in percentages (sum = 100n) expressed in basis points of 1 (i.e. 50n => 50%).
 * - depositAmount: Amount to distribute.
 * - currentBalances: Record<key, Amount> existing holdings.
 * Algorithm:
 * 1. totalAfter = sum(currentBalances) + deposit
 * 2. targetAbs[key] = totalAfter * targetPct / 100n
 * 3. need[key] = max(0, targetAbs[key] - currentBalances[key]) (skip over-target positions)
 * 4. sumNeeds = Σ need
 * 5. If sumNeeds == 0 -> {} (nothing to allocate)
 * 6. If sumNeeds <= deposit => transfer = need
 * 7. Else scale each: needScaled = (need * deposit) / sumNeeds (floor). (Remainder ignored; tests tolerate)
 * 8. Return only entries with transfer > 0
 */
export const planDepositTransfers = (depositAmount, currentBalances, targetAllocation) => {
  const brand = depositAmount.brand;
  const make = v => AmountMath.make(brand, v);
  const deposit = depositAmount.value;
  // Sum current balances
  let currentTotal = 0n;
  for (const amt of Object.values(currentBalances)) currentTotal += amt.value;
  const totalAfter = currentTotal + deposit;

  // Compute needs (positive deficits only)
  const needs = {};
  let sumNeeds = 0n;
  for (const [k, pct] of Object.entries(targetAllocation)) {
    const targetAbs = (totalAfter * BigInt(pct)) / 100n;
    const cur = currentBalances[k]?.value || 0n;
    if (cur >= targetAbs) continue; // already at/over target
    const need = targetAbs - cur;
    if (need > 0n) {
      needs[k] = need;
      sumNeeds += need;
    }
  }
  if (sumNeeds === 0n || deposit === 0n) return {};

  const result = {};
  if (sumNeeds <= deposit) {
    for (const [k, need] of Object.entries(needs)) result[k] = make(need);
    return result;
  }
  // Scale proportionally
  for (const [k, need] of Object.entries(needs)) {
    const scaled = (need * deposit) / sumNeeds; // floor
    if (scaled > 0n) result[k] = make(scaled);
  }
  return result;
};