import { AxelarChain } from './constants.js';
import type { MovementDesc, PoolKey } from './type-guards.ts';

type MoveAnyAmt = Omit<MovementDesc, 'amount'>;

type Rule = { goal: MoveAnyAmt; path: MoveAnyAmt[] };
type PoolRules = Record<'supply' | 'withdraw', Rule>;

const rulesForUSDN = (() => {
  const rulesFor = (poolKey: 'USDN' | 'USDNVault') => ({
    [poolKey]: {
      supply: {
        goal: { src: 'Deposit', dest: poolKey },
        path: [
          { src: 'Deposit', dest: 'agoric.makeAccount()' },
          { src: 'agoric.makeAccount()', dest: 'noble.makeAccount()' },
          { src: 'noble.makeAccount()', dest: poolKey },
        ],
      },
      withdraw: {
        goal: { src: poolKey, dest: 'Cash' },
        path: [
          { src: poolKey, dest: 'noble.makeAccount()' },
          { src: 'noble.makeAccount()', dest: 'agoric.makeAccount()' },
          { src: 'agoric.makeAccount()', dest: 'Cash' },
        ],
      },
    } as PoolRules,
  });
  return { ...rulesFor('USDN'), ...rulesFor('USDNVault') } as Record<
    'USDN' | 'USDNVault',
    PoolRules
  >;
})();

const rulesForEVM = (() => {
  const rulesFor = (protocol: 'Aave' | 'Compound', chain: AxelarChain) => {
    const poolKey: PoolKey = `${protocol}_${chain}`;
    return {
      supply: {
        goal: { src: 'Deposit', dest: poolKey },
        path: [
          { src: 'Deposit', dest: 'agoric.makeAccount()' },
          { src: 'agoric.makeAccount()', dest: 'noble.makeAccount()' },
          { src: 'noble.makeAccount()', dest: `${chain}.makeAccount()` },
          { src: `${chain}.makeAccount()`, dest: poolKey },
        ],
      },
      withdraw: {
        goal: { src: poolKey, dest: 'Cash' },
        path: [
          { src: poolKey, dest: `${chain}.makeAccount()` },
          { src: `${chain}.makeAccount()`, dest: 'noble.makeAccount()' },
          { src: 'noble.makeAccount()', dest: 'agoric.makeAccount()' },
          { src: 'agoric.makeAccount()', dest: 'Cash' },
        ],
      },
    } as PoolRules;
  };
  const out: Partial<Record<PoolKey, PoolRules>> = {};
  for (const protocol of ['Aave', 'Compound'] as const) {
    for (const chain of Object.values(AxelarChain)) {
      const poolKey: PoolKey = `${protocol}_${chain}`;
      out[poolKey] = rulesFor(protocol, chain);
    }
  }
  return harden(out);
})();

// XXX NEEDSTEST: we can compute how for each of these moves

export const movementRules = {
  ...rulesForUSDN,
  ...rulesForEVM,
};
harden(movementRules);

const check = () => {
  for (const [key, rules] of Object.entries(movementRules)) {
    for (const [dir, rule] of Object.entries(rules)) {
      const { goal, path } = rule;
      assert.equal(goal.src, path[0].src, `bad rule: ${key}.${dir}`);
      assert.equal(goal.dest, path.at(-1)!.dest, `bad rule: ${key}.${dir}`);
    }
  }
};
check();
