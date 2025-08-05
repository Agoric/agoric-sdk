type Pool = string;

export interface Transfer {
  from: Pool;
  to: Pool;
  amount: number;
}

export function rebalanceMinCostFlow(
  currentBalances: Record<Pool, number>,
  targetAllocations: Record<Pool, number>,
): Transfer[] {
  const epsilon = 1e-6;

  const total = Object.values(currentBalances).reduce(
    (sum, val) => sum + val,
    0,
  );

  const targetBalances: Record<Pool, number> = Object.fromEntries(
    Object.entries(targetAllocations).map(([pool, pct]) => [pool, pct * total]),
  );

  const deltas: Record<Pool, number> = Object.fromEntries(
    Object.keys(targetAllocations).map(pool => [
      pool,
      (currentBalances[pool] ?? 0) - targetBalances[pool],
    ]),
  );

  type PoolDelta = { pool: Pool; amount: number };

  const surplus: PoolDelta[] = Object.entries(deltas)
    .filter(([, delta]) => delta > epsilon)
    .map(([pool, amount]) => ({ pool, amount }));

  const deficit: PoolDelta[] = Object.entries(deltas)
    .filter(([, delta]) => delta < -epsilon)
    .map(([pool, delta]) => ({ pool, amount: -delta }));

  const transfers: Transfer[] = [];

  while (surplus.length > 0 && deficit.length > 0) {
    surplus.sort((a, b) => b.amount - a.amount);
    deficit.sort((a, b) => b.amount - a.amount);

    const from = surplus[0];
    const to = deficit[0];
    const amount = Math.min(from.amount, to.amount);

    transfers.push({ from: from.pool, to: to.pool, amount });

    from.amount -= amount;
    to.amount -= amount;

    if (from.amount < epsilon) surplus.shift();
    if (to.amount < epsilon) deficit.shift();
  }

  return transfers;
}
