import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards';
import type { AssetPlaceRef } from './type-guards-steps.ts';

// XXX Define in AmountMath?
const compareAmounts = (a: NatAmount, b: NatAmount): -1 | 0 | 1 => {
  const aValue = a.value;
  const bValue = b.value;
  // eslint-disable-next-line no-nested-ternary
  return aValue > bValue ? 1 : aValue < bValue ? 1 : 0;
};

export interface Transfer {
  from: PoolKey;
  to: PoolKey;
  amount: NatAmount;
}

export function rebalanceMinCostFlow(
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>,
  targetAllocations: Partial<Record<AssetPlaceRef, bigint>>,
  brand: Brand,
): Transfer[] {
  const epsilon = AmountMath.make(brand, 1n);

  const total = Object.values(currentBalances).reduce(
    (sum, amount) => AmountMath.add(sum, amount),
    AmountMath.makeEmpty(brand),
  );

  const targetBalances = Object.fromEntries(
    Object.entries(targetAllocations).map(([pool, basisPoints]) => [
      pool,
      AmountMath.make(brand, (total.value * basisPoints) / 10000n),
    ]),
  ) as Record<PoolKey, NatAmount>;

  type PoolDelta = { pool: PoolKey; amount: NatAmount };

  const surplus: PoolDelta[] = [];
  const deficit: PoolDelta[] = [];

  for (const poolKey of Object.keys(targetAllocations)) {
    const pool = poolKey as PoolKey;
    const current = currentBalances[pool] ?? AmountMath.makeEmpty(brand);
    const target = targetBalances[pool];

    if (AmountMath.isGTE(current, target)) {
      const surplusAmount = AmountMath.subtract(current, target);
      if (AmountMath.isGTE(surplusAmount, epsilon)) {
        surplus.push({ pool, amount: surplusAmount });
      }
    } else {
      const deficitAmount = AmountMath.subtract(target, current);
      if (AmountMath.isGTE(deficitAmount, epsilon)) {
        deficit.push({ pool, amount: deficitAmount });
      }
    }
  }

  const transfers: Transfer[] = [];

  while (surplus.length > 0 && deficit.length > 0) {
    surplus.sort((a, b) => compareAmounts(b.amount, a.amount));
    deficit.sort((a, b) => compareAmounts(b.amount, a.amount));

    const from = surplus[0];
    const to = deficit[0];
    const amount = AmountMath.min(from.amount, to.amount);

    transfers.push({ from: from.pool, to: to.pool, amount });

    from.amount = AmountMath.subtract(from.amount, amount);
    to.amount = AmountMath.subtract(to.amount, amount);

    if (AmountMath.isEmpty(from.amount)) surplus.shift();
    if (AmountMath.isEmpty(to.amount)) deficit.shift();
  }

  return transfers;
}
