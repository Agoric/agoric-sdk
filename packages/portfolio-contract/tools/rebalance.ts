import { AmountMath } from '@agoric/ertp';
import type { Amount, Brand } from '@agoric/ertp/src/types.js';
import type { PoolKey } from '../src/type-guards.ts';

type Pool = PoolKey;

export interface Transfer {
  from: Pool;
  to: Pool;
  amount: Amount;
}

export function rebalanceMinCostFlow(
  currentBalances: Record<Pool, Amount>,
  targetAllocations: Record<Pool, bigint>,
  brand: Brand,
): Transfer[] {
  const epsilon = AmountMath.make(brand, 1n);

  const total = Object.values(currentBalances).reduce(
    (sum, amount) => AmountMath.add(sum, amount),
    AmountMath.makeEmpty(brand),
  );

  const targetBalances: Record<Pool, Amount> = Object.fromEntries(
    Object.entries(targetAllocations).map(([pool, basisPoints]) => [
      pool,
      AmountMath.make(brand, (total.value * basisPoints) / 10000n),
    ]),
  );

  type PoolDelta = { pool: Pool; amount: Amount };

  const surplus: PoolDelta[] = [];
  const deficit: PoolDelta[] = [];

  for (const pool of Object.keys(targetAllocations)) {
    const current = currentBalances[pool] ?? AmountMath.makeEmpty(brand);
    const target = targetBalances[pool];

    if (AmountMath.isGTE(current, target)) {
      const surplusAmount = AmountMath.subtract(current, target);
      if (AmountMath.isGTE(surplusAmount, epsilon)) {
        surplus.push({ pool: pool as PoolKey, amount: surplusAmount });
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
    surplus.sort((a, b) => Number(b.amount.value) - Number(a.amount.value));
    deficit.sort((a, b) => Number(b.amount.value) - Number(a.amount.value));

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
