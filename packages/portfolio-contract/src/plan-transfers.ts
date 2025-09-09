import { AmountMath } from '@agoric/ertp';
import type { Amount, Brand, NatAmount, NatValue } from '@agoric/ertp';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards';
import { PoolPlaces } from '@aglocal/portfolio-contract/src/type-guards.js';
import type { MovementDesc } from './type-guards-steps.ts';
import { NonNullish } from '@agoric/internal';
import type {
  YieldProtocol,
  AxelarChain,
} from '@agoric/portfolio-api/src/constants.js';
import { throwRedacted as Fail } from '@endo/errors';
import { objectMap } from '@endo/patterns';
/**
 * Plan deposit transfers based on the target allocation and current balances.
 *
 * @param deposit - The amount to be deposited.
 * @param currentBalances - Current balances for each position.
 * @param targetAllocation - Target allocation percentages for each position.
 * @returns Planned transfers for each position.
 */
export function planDepositTransfers(
  deposit: Amount<'nat'>,
  currentBalances: Record<string, Amount<'nat'>>,
  targetAllocation: TargetAllocation,
): Record<string, Amount<'nat'>> {
  const totalTargetPercentage = Object.values(targetAllocation).reduce(
    (sum, percentage) => sum + percentage,
    0n,
  );

  if (totalTargetPercentage !== 100n) {
    throw new Error('Target allocation percentages must sum to 100');
  }

  const totalCurrentBalance = Object.values(currentBalances).reduce(
    (sum, balance) => AmountMath.add(sum, balance),
    AmountMath.makeEmpty(deposit.brand),
  );

  const totalAfterDeposit = AmountMath.add(totalCurrentBalance, deposit);

  const plannedTransfers: Record<string, Amount<'nat'>> = {};
  for (const [key, targetPercentage] of Object.entries(targetAllocation)) {
    const targetAmount = AmountMath.make(
      deposit.brand,
      (totalAfterDeposit.value * targetPercentage) / 100n,
    );

    const currentBalance =
      currentBalances[key] || AmountMath.makeEmpty(deposit.brand);

    if (AmountMath.isGTE(currentBalance, targetAmount)) {
      plannedTransfers[key] = AmountMath.makeEmpty(deposit.brand);
    } else {
      plannedTransfers[key] = AmountMath.subtract(targetAmount, currentBalance);
    }
  }

  const totalPlanned = Object.values(plannedTransfers).reduce(
    (sum, transfer) => AmountMath.add(sum, transfer),
    AmountMath.makeEmpty(deposit.brand),
  );

  if (AmountMath.isGTE(totalPlanned, deposit)) {
    const scalingFactor = deposit.value / totalPlanned.value;
    for (const key of Object.keys(plannedTransfers)) {
      plannedTransfers[key] = AmountMath.make(
        deposit.brand,
        (plannedTransfers[key].value * scalingFactor) / 1n,
      );
    }
  }

  return plannedTransfers;
}

/** outbound only. XXX rename. presumes assets are in @noble */
export const planTransfer = (
  dest: PoolKey,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
  preface: MovementDesc[] = [],
  // preface: MovementDesc[] = [
  //   { src: '+agoric', dest: '@agoric', amount },
  //   { src: '@agoric', dest: '@noble', amount },
  // ],
): MovementDesc[] => {
  const { protocol: p, chainName: evm } = PoolPlaces[dest];
  const steps: MovementDesc[] = [];

  switch (p) {
    case 'USDN':
      const detail = { usdnOut: ((amount.value || 0n) * 99n) / 100n };
      console.warn('TODO: client should query exchange rate');
      steps.push({ src: '@noble', dest: 'USDNVault', amount, detail });
      break;
    case 'Aave':
    case 'Compound':
      // XXX optimize: combine noble->evm steps
      steps.push({
        src: '@noble',
        dest: `@${evm}`,
        amount,
        // TODO: Rather than hard-code, derive from Axelar `estimateGasFee`.
        // https://docs.axelar.dev/dev/axelarjs-sdk/axelar-query-api#estimategasfee
        fee: make(feeBrand, 15_000_000n),
      });
      console.warn('TODO: fees');
      steps.push({
        src: `@${evm}`,
        dest: `${p}_${evm}`,
        amount,
        fee: make(feeBrand, 15_000_000n), // KLUDGE.
      });
      break;
    default:
      throw Error('unreachable');
  }
  return harden([...preface, ...steps]);
};

/** uses @noble as the sync point */
export const planTransferPath = (
  src: PoolKey,
  dest: PoolKey,
  amount: NatAmount,
): MovementDesc[] => {
  // if the assets are already there, an empty path is in order
  if (src === dest) {
    return harden([]);
  }

  // kludge: get a separte brand
  const feeBrand = AmountMath.getBrand(amount);
  const tail = planTransfer(dest, amount, feeBrand);
  const { protocol: p, chainName: evm } = PoolPlaces[src];
  const steps: MovementDesc[] = [];

  switch (p) {
    case 'USDN':
      steps.push({ dest: '@noble', src: 'USDNVault', amount });
      break;
    case 'Aave':
    case 'Compound':
      console.warn('TODO: fees');
      steps.push({
        src: `${p}_${evm}`,
        dest: `@${evm}`,
        amount,
        // TODO fee: fees[p].Call,
      });
      // XXX optimize: combine noble->evm steps
      steps.push({
        src: `@${evm}`,
        dest: '@noble',
        amount,
        // XXXfee: fees[p].Account,
      });
      break;
    default:
      throw Error('unreachable');
  }
  return harden([...steps, ...tail]);
};
const { entries, values } = Object;
const { add, make } = AmountMath;
const amountSum = <A extends Amount>(amounts: A[]) =>
  amounts.reduce((acc, v) => add(acc, v));

/**
 * Creates a sequence of movement steps to achieve a portfolio allocation goal.
 *
 * This function generates a list of `MovementDesc` steps to move assets
 * between different positions (e.g., USDN, Aave, Compound) to achieve the
 * desired portfolio allocation. It also calculates the total deposit and
 * optional GMP fees required for the movements.
 *
 * @template G - A partial record of yield protocols and their target amounts.
 * @param {G} goal - The target allocation for each yield protocol.
 * @param {object} opts - Additional options for the portfolio steps.
 * @param {AxelarChain} [opts.evm='Arbitrum'] - The default EVM chain for Aave/Compound.
 * @param {Brand<'nat'>} [opts.feeBrand] - The brand for GMP fees.
 * @param {Record<keyof G, { Account: NatAmount; Call: NatAmount }>} [opts.fees] - Fees for account and contract calls.
 * @param {{ usdnOut: NatValue }} [opts.detail] - Details for USDN transfers.
 * @returns {{ give: Record<string, Amount<'nat'>>; steps: MovementDesc[] }} - The calculated deposit and movement steps.
 *
 * @throws Will throw if the goal is empty or if required parameters are missing.
 *
 * @example
 * const goal = { USDN: AmountMath.make(brand, 1000n), Aave: AmountMath.make(brand, 500n) };
 * const { give, steps } = makePortfolioSteps(goal, { evm: 'Arbitrum', feeBrand });
 * console.log(give); // { Deposit: ..., GmpFee: ... }
 * console.log(steps); // [{ src: '<Deposit>', dest: '@agoric', amount: ... }, ...]
 */
export const makePortfolioSteps = <
  G extends Partial<Record<YieldProtocol, NatAmount>>,
>(
  goal: G,
  opts: {
    /** XXX assume same chain for Aave and Compound */
    evm?: AxelarChain;
    feeBrand?: Brand<'nat'>;
    fees?: Record<keyof G, { Account: NatAmount; Call: NatAmount }>;
    detail?: { usdnOut: NatValue };
  } = {},
) => {
  values(goal).length > 0 || Fail`empty goal`;
  const { USDN: _1, ...evmGoal } = goal;
  const {
    evm = 'Arbitrum',
    feeBrand,
    fees = objectMap(evmGoal, _ => ({
      Account: make(NonNullish(feeBrand), 150n),
      Call: make(NonNullish(feeBrand), 100n),
    })),
    detail = 'USDN' in goal
      ? { usdnOut: ((goal.USDN?.value || 0n) * 99n) / 100n }
      : undefined,
  } = opts;
  const steps: MovementDesc[] = [];

  const Deposit = amountSum(values(goal));
  const GmpFee =
    values(fees).length > 0
      ? amountSum(
          values(fees)
            .map(f => [f.Account, f.Call])
            .flat(),
        )
      : undefined;
  const give = { Deposit, ...(GmpFee ? { GmpFee } : {}) };
  steps.push({ src: '<Deposit>', dest: '@agoric', amount: Deposit });
  steps.push({ src: '@agoric', dest: '@noble', amount: Deposit });
  for (const [p, amount] of entries(goal)) {
    switch (p) {
      case 'USDN':
        steps.push({ src: '@noble', dest: 'USDNVault', amount, detail });
        break;
      case 'Aave':
      case 'Compound':
        // XXX optimize: combine noble->evm steps
        steps.push({
          src: '@noble',
          dest: `@${evm}`,
          amount,
          fee: fees[p].Account,
        });
        steps.push({
          src: `@${evm}`,
          dest: `${p}_${evm}`,
          amount,
          fee: fees[p].Call,
        });
        break;
      default:
        throw Error('unreachable');
    }
  }

  return harden({ give, steps });
};
