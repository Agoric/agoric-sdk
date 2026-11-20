/**
 * @file Bind reward claim and swap plan steps to the signed evidence they
 * select, and re-check those bindings against configuration at execution.
 * @see {@link bindRewardClaim}
 * @see {@link bindRewardSwap}
 * @see {@link vetRewardSwapBudgets}
 */
import { sameEvmAddress } from '@agoric/orchestration/src/utils/address.js';
import {
  getMinAmountOutForSlippage,
  MAX_REWARD_SWAP_SLIPPAGE_BPS,
  type ClaimRewardsSelector,
  type EvmAccountRef,
  type FundsFlowPlan,
  type HexBytes,
  type InstrumentId,
  type MovementDesc,
  type PlanObservations,
  type SelectableObservations,
  type SwapSelector,
} from '@agoric/portfolio-api';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import {
  getMerklClaimExpectedAmount,
  rewardClaimProtocols,
} from '@agoric/portfolio-api/src/observation-messages.js';
import {
  assertEvmAccountRef,
  evmChainOf,
  isEvmAccountRef,
  makeTokenIdKey,
  PoolPlaces,
} from '@agoric/portfolio-api/src/places.js';
import { Fail, q } from '@endo/errors';
import type { Address as EvmAddress } from 'abitype';
import type { EVMContractAddresses } from './portfolio.contract.ts';
import { fullOrder, makeDependencies } from './schedule-order.ts';

const { keys } = Object;

/**
 * A reward claim derived from signed claim evidence: what to call, and how
 * much of `tokenId` it is expected (not guaranteed) to pay to `account`.
 */
export type ClaimBoundStep = Readonly<
  {
    kind: 'claimRewards';
    /** the chain account receiving the rewards */
    account: EvmAccountRef;
    tokenId: EvmAddress;
    /** an estimate for budgeting dependent swaps, neither exact nor a minimum */
    expectedAmount: bigint;
  } & (
    | {
        protocol: 'aave';
        src: InstrumentId;
        controller: EvmAddress;
        /** the asset whose accrued rewards are claimed (aToken) */
        asset: EvmAddress;
      }
    | {
        protocol: 'compound';
        src: InstrumentId;
        controller: EvmAddress;
        comet: EvmAddress;
      }
    | {
        protocol: 'merkl';
        distributor: EvmAddress;
        cumulativeAmount: bigint;
        proofs: readonly HexBytes[];
      }
  )
>;

/**
 * A reward swap derived from signed swap instructions: exactly `amountIn` of
 * `tokenIn` for at least `minAmountOut` of `tokenOut`, paid to `account`.
 * The contract checks and accounts for the provider-neutral fields; it only
 * passes the provider-specific ones on to the provider.
 */
export type SwapBoundStep = Readonly<
  {
    kind: 'swap';
    account: EvmAccountRef;
    tokenIn: EvmAddress;
    tokenOut: EvmAddress;
    amountIn: bigint;
    quotedAmountOut: bigint;
    minAmountOut: bigint;
  } & {
    provider: '1inch';
    router: EvmAddress;
    /** route internals, opaque to the contract */
    executor: EvmAddress;
    srcReceiver: EvmAddress;
    data: HexBytes;
    /** appended after the router call's ABI-encoded arguments */
    calldataSuffix: HexBytes;
  }
>;

export type RewardBoundStep = ClaimBoundStep | SwapBoundStep;

/**
 * Configured contract addresses of an EVM chain, if any. Must be a pure
 * lookup: {@link assertRewardBinding} calls it from the `executePlan` async
 * flow.
 */
export type GetEvmContracts = (
  chain: AxelarChain,
) => Partial<EVMContractAddresses> | undefined;

const selectEvidence = <K extends keyof SelectableObservations>(
  observations: SelectableObservations,
  key: K,
  index: number,
): NonNullable<SelectableObservations[K]>[number] => {
  const evidence = observations[key];
  (Number.isSafeInteger(index) && evidence && index < evidence.length) ||
    Fail`no ${q(key)} evidence at index ${q(index)}`;
  return evidence![index]!;
};

/**
 * Tokens that reward swaps may never spend: the principal and cash tokens of
 * `chain` in contract configuration, whatever observations claim about them.
 *
 * @throws {Error} if the configuration needed to identify them is missing
 */
export const getProtectedSwapTokens = (
  chain: AxelarChain,
  contracts: Partial<EVMContractAddresses> | undefined,
): EvmAddress[] => {
  const { usdc, aaveUSDC, compound } = contracts ?? {};
  if (!usdc || !aaveUSDC || !compound) {
    throw Fail`protected token configuration is incomplete for ${q(chain)}`;
  }
  const instrumentTokens = keys(PoolPlaces).flatMap(instrument => {
    const { chainName } = PoolPlaces[instrument as keyof typeof PoolPlaces];
    const address =
      chainName === chain
        ? contracts![instrument as keyof EVMContractAddresses]
        : undefined;
    return typeof address === 'string' ? [address as EvmAddress] : [];
  });
  return harden([usdc, aaveUSDC, compound, ...instrumentTokens]);
};
harden(getProtectedSwapTokens);

/** Identity of what a claim collects, to reject duplicate claims. */
export const claimIdentity = (bound: ClaimBoundStep): string => {
  const token = makeTokenIdKey(bound.tokenId);
  switch (bound.protocol) {
    case 'aave':
      return `aave:${bound.src}:${token}`;
    case 'compound':
      // A Compound claim collects everything owed, whatever the token.
      return `compound:${bound.src}`;
    case 'merkl':
      return `merkl:${bound.account}:${token}`;
    default:
      throw Fail`unknown claim protocol ${q(bound)}`;
  }
};

/**
 * Derive a reward claim from the signed evidence a plan step selects.
 *
 * Execution claims for the portfolio's own account, from configured
 * contracts only; nothing in the evidence can redirect the rewards. An
 * Aave or Compound claim moves from its instrument to the chain account,
 * while a Merkl claim is account-scoped and stays at the chain account.
 *
 * @throws {Error} if the selected evidence does not exist, does not match
 *   the step, or requires contracts that are not configured
 */
export const bindRewardClaim = (
  move: Pick<MovementDesc, 'src' | 'dest' | 'amount'>,
  selector: ClaimRewardsSelector,
  observations: PlanObservations,
  getEvmContracts: GetEvmContracts,
): ClaimBoundStep => {
  const { src, dest, amount } = move;
  const { protocol, index } = selector;
  // Claims guarantee no proceeds, so they never fund other movements.
  amount.value === 0n ||
    Fail`claim step amount must be zero, not ${q(amount.value)}`;
  switch (protocol) {
    case 'aave':
    case 'compound': {
      const { evidenceKey, yieldProtocol } = rewardClaimProtocols[protocol];
      const evidence = selectEvidence(observations, evidenceKey, index);
      const { instrumentId, tokenId, expectedAmount } = evidence;
      src === instrumentId ||
        Fail`${q(protocol)} claim evidence is for ${q(instrumentId)}, not ${q(src)}`;
      const place = PoolPlaces[src as keyof typeof PoolPlaces];
      place?.protocol === yieldProtocol ||
        Fail`${q(protocol)} claim requires a ${q(yieldProtocol)} instrument, not ${q(src)}`;
      const instrument = src as InstrumentId;
      const chain = place.chainName as AxelarChain;
      dest === `@${chain}` ||
        Fail`${q(protocol)} claim from ${q(src)} must go to ${q(`@${chain}`)}, not ${q(dest)}`;
      const contracts = getEvmContracts(chain);
      if (protocol === 'aave') {
        const controller = contracts?.aaveRewardsController;
        const asset = contracts?.aaveUSDC;
        if (!controller || !asset) {
          throw Fail`Aave rewards not configured for ${q(chain)}`;
        }
        return harden({
          kind: 'claimRewards',
          protocol,
          src: instrument,
          account: `@${chain}`,
          controller,
          asset,
          tokenId,
          expectedAmount,
        });
      }
      const controller = contracts?.compoundRewardsController;
      const comet = contracts?.compound;
      if (!controller || !comet) {
        throw Fail`Compound rewards not configured for ${q(chain)}`;
      }
      return harden({
        kind: 'claimRewards',
        protocol,
        src: instrument,
        account: `@${chain}`,
        controller,
        comet,
        tokenId,
        expectedAmount,
      });
    }
    case 'merkl': {
      const { evidenceKey } = rewardClaimProtocols[protocol];
      const evidence = selectEvidence(observations, evidenceKey, index);
      assertEvmAccountRef(src);
      const account = src;
      (dest === account && evidence.accountPlace === account) ||
        Fail`Merkl claim for ${q(evidence.accountPlace)} must stay at that account, not ${q(src)} -> ${q(dest)}`;
      const chain = evmChainOf(account);
      const distributor = getEvmContracts(chain)?.merkleDistributor;
      if (!distributor) {
        throw Fail`Merkl distributor not configured for ${q(chain)}`;
      }
      sameEvmAddress(evidence.distributor, distributor) ||
        Fail`Merkl claim distributor ${q(evidence.distributor)} is not configured for ${q(chain)}`;
      const { tokenId, cumulativeAmount, claimedAmount, proofs } = evidence;
      cumulativeAmount >= claimedAmount ||
        Fail`Merkl claimedAmount ${q(claimedAmount)} exceeds cumulativeAmount ${q(cumulativeAmount)}`;
      return harden({
        kind: 'claimRewards',
        protocol,
        account,
        distributor,
        tokenId,
        cumulativeAmount,
        proofs,
        expectedAmount: getMerklClaimExpectedAmount(evidence),
      });
    }
    default:
      throw Fail`unsupported claim protocol ${q(protocol)}`;
  }
};
harden(bindRewardClaim);

/**
 * Derive a reward swap from the signed instructions a plan step selects.
 *
 * The swap spends exactly `amountIn` of a reward token for at least the
 * step's `amount` of the chain's configured USDC, which must be the signed
 * `minAmountOut`. Execution approves only `amountIn` for the configured
 * router, and pays the proceeds to the portfolio's own account; the route
 * itself remains provider data the contract does not interpret.
 *
 * Only tokens outside the contract's own principal and cash tokens
 * ({@link getProtectedSwapTokens}) may be spent, regardless of the
 * observations. Whether the account holds enough of them is checked
 * separately, across all swaps of the plan ({@link vetRewardSwapBudgets}).
 *
 * @param now current time, in seconds since the epoch
 * @throws {Error} if the instructions don't exist, don't match the step, or
 *   violate swap policy
 */
export const bindRewardSwap = (
  move: Pick<MovementDesc, 'src' | 'dest' | 'amount'>,
  selector: SwapSelector,
  observations: PlanObservations,
  getEvmContracts: GetEvmContracts,
  now: bigint,
): SwapBoundStep => {
  const { src, dest, amount } = move;
  const { provider, index } = selector;
  provider === '1inch' || Fail`unsupported swap provider ${q(provider)}`;
  const instructions = selectEvidence(observations, 'oneInchSwaps', index);
  const {
    accountPlace,
    tokenIn,
    tokenOut,
    amountIn,
    quotedAmountOut,
    minAmountOut,
    slippageBps,
    expiresAt,
    flags,
    executor,
    srcReceiver,
    data,
    calldataSuffix,
  } = instructions;
  assertEvmAccountRef(src);
  const account = src;
  (dest === account && accountPlace === account) ||
    Fail`swap at ${q(accountPlace)} must stay at that account, not ${q(src)} -> ${q(dest)}`;
  const chain = evmChainOf(account);
  const contracts = getEvmContracts(chain);
  const router = contracts?.oneInchRouter;
  const usdc = contracts?.usdc;
  if (!router || !usdc) {
    throw Fail`1inch swaps not configured for ${q(chain)}`;
  }
  sameEvmAddress(tokenOut, usdc) ||
    Fail`swap tokenOut ${q(tokenOut)} is not the configured USDC of ${q(chain)}`;
  for (const token of getProtectedSwapTokens(chain, contracts)) {
    !sameEvmAddress(tokenIn, token) ||
      Fail`swap tokenIn ${q(tokenIn)} is a protected token of ${q(chain)}`;
  }
  amountIn > 0n || Fail`swap amountIn must be positive`;
  // Partial fills would only guarantee a proportional minimum.
  flags === 0n || Fail`swap flags must be 0, not ${q(flags)}`;
  slippageBps <= MAX_REWARD_SWAP_SLIPPAGE_BPS ||
    Fail`swap slippageBps ${q(slippageBps)} exceeds ${q(MAX_REWARD_SWAP_SLIPPAGE_BPS)}`;
  const leastMinimum = getMinAmountOutForSlippage(quotedAmountOut, slippageBps);
  minAmountOut >= leastMinimum ||
    Fail`swap minAmountOut ${q(minAmountOut)} is below ${q(leastMinimum)} for quotedAmountOut ${q(quotedAmountOut)} with slippageBps ${q(slippageBps)}`;
  minAmountOut > 0n || Fail`swap minAmountOut must be positive`;
  now < expiresAt ||
    Fail`swap instructions expired at ${q(expiresAt)}; now ${q(now)}`;
  amount.value === minAmountOut ||
    Fail`swap step amount ${q(amount.value)} must be its minAmountOut ${q(minAmountOut)}`;
  return harden({
    kind: 'swap',
    provider,
    account,
    router,
    tokenIn,
    tokenOut,
    amountIn,
    quotedAmountOut,
    minAmountOut,
    executor,
    srcReceiver,
    data,
    calldataSuffix,
  });
};
harden(bindRewardSwap);

const budgetKey = (account: EvmAccountRef, tokenId: string) =>
  `${account}:${makeTokenIdKey(tokenId)}`;

/**
 * Check that every reward swap is funded, without counting any reward
 * token twice: from signed `claimed-reward` holdings of its token at its
 * account, and from the expected payouts of claims of that token that
 * precede it in the plan's order. Unclaimed (`claimable-reward`) holdings
 * only count through such claims.
 *
 * Claim payouts are estimates: a claim paying less than expected makes a
 * dependent swap fail at execution, rather than spend anything else.
 *
 * Each swap draws on the claims it depends upon first, then on holdings.
 * This allocation may reject a plan that some other allocation would fund,
 * but never accepts one that double-counts.
 *
 * @param steps the bound reward step of each plan step, if any
 * @param order the plan's order, sequential when absent
 * @throws {Error} if a claim is selected twice, or a swap is not funded
 */
export const vetRewardSwapBudgets = (
  steps: ReadonlyArray<RewardBoundStep | undefined>,
  order: FundsFlowPlan['order'],
  observations: Pick<PlanObservations, 'holdings'>,
): void => {
  const claimed = new Set<string>();
  for (const step of steps) {
    if (step?.kind !== 'claimRewards') continue;
    const identity = claimIdentity(step);
    !claimed.has(identity) || Fail`duplicate reward claim ${q(identity)}`;
    claimed.add(identity);
  }

  const held = new Map<string, bigint>();
  for (const { place, kind, tokenId, amount } of observations.holdings ?? []) {
    if (kind !== 'claimed-reward' || !isEvmAccountRef(place)) continue;
    const key = budgetKey(place, tokenId);
    held.set(key, (held.get(key) ?? 0n) + amount);
  }
  const claimRemaining = new Map<number, bigint>(
    steps.flatMap((step, ix) =>
      step?.kind === 'claimRewards' ? [[ix, step.expectedAmount]] : [],
    ),
  );

  const dependencies = makeDependencies(
    steps.length,
    order ?? fullOrder(steps.length),
  );
  const ancestorsOf = (ix: number): number[] => {
    const seen = new Set<number>();
    const visit = (node: number) => {
      for (const prereq of dependencies.get(node) ?? []) {
        if (seen.has(prereq)) continue;
        seen.add(prereq);
        visit(prereq);
      }
    };
    visit(ix);
    return [...seen].sort((a, b) => a - b);
  };

  for (const [ix, step] of steps.entries()) {
    if (step?.kind !== 'swap') continue;
    const key = budgetKey(step.account, step.tokenIn);
    let need = step.amountIn;
    for (const prereq of ancestorsOf(ix)) {
      const claim = steps[prereq];
      if (claim?.kind !== 'claimRewards') continue;
      if (budgetKey(claim.account, claim.tokenId) !== key) continue;
      const remaining = claimRemaining.get(prereq) ?? 0n;
      const take = remaining < need ? remaining : need;
      claimRemaining.set(prereq, remaining - take);
      need -= take;
    }
    const available = held.get(key) ?? 0n;
    const take = available < need ? available : need;
    held.set(key, available - take);
    need -= take;
    need === 0n ||
      Fail`unfunded reward swap at step ${q(ix)}: ${q(step.amountIn)} of ${q(step.tokenIn)} exceeds observed and prerequisite claimed rewards by ${q(need)}`;
  }
};
harden(vetRewardSwapBudgets);

/** Whether a bound claim still targets the contracts configured for its chain. */
const isClaimConfigured = (
  bound: ClaimBoundStep,
  contracts: ReturnType<GetEvmContracts>,
): boolean => {
  switch (bound.protocol) {
    case 'aave':
      return (
        sameEvmAddress(bound.controller, contracts?.aaveRewardsController) &&
        sameEvmAddress(bound.asset, contracts?.aaveUSDC)
      );
    case 'compound':
      return (
        sameEvmAddress(
          bound.controller,
          contracts?.compoundRewardsController,
        ) && sameEvmAddress(bound.comet, contracts?.compound)
      );
    case 'merkl':
      return sameEvmAddress(bound.distributor, contracts?.merkleDistributor);
    default:
      throw Fail`unknown claim protocol ${q(bound)}`;
  }
};

/**
 * At execution, check that a bound reward step still matches the movement
 * that selects it and the contract configuration of the flow.
 *
 * Called from the `executePlan` async flow, before any remote dispatch, and
 * so again whenever the flow replays: keep it synchronous and free of side
 * effects, depending only on its arguments. The configuration
 * `getEvmContracts` reads there is that of the flow's context, captured when
 * the flow started, so replay reaches the same outcome, and a flow started
 * before an upgrade keeps checking against the addresses it started with.
 */
export const assertRewardBinding = (
  move: Pick<MovementDesc, 'src' | 'dest' | 'amount' | 'claimRewards' | 'swap'>,
  bound: RewardBoundStep,
  getEvmContracts: GetEvmContracts,
): void => {
  const { src, dest, amount } = move;
  if (bound.kind === 'claimRewards') {
    (move.claimRewards?.protocol === bound.protocol &&
      !move.swap &&
      amount.value === 0n &&
      dest === bound.account &&
      src === ('src' in bound ? bound.src : bound.account)) ||
      Fail`claim evidence does not match movement ${q(src)} -> ${q(dest)}`;
    const chain = evmChainOf(bound.account);
    isClaimConfigured(bound, getEvmContracts(chain)) ||
      Fail`${q(bound.protocol)} claim configuration no longer matches on ${q(chain)}`;
    return;
  }
  (move.swap?.provider === bound.provider &&
    !move.claimRewards &&
    src === bound.account &&
    dest === bound.account &&
    amount.value === bound.minAmountOut) ||
    Fail`swap instructions do not match movement ${q(src)} -> ${q(dest)}`;
  const chain = evmChainOf(bound.account);
  const contracts = getEvmContracts(chain);
  (sameEvmAddress(bound.router, contracts?.oneInchRouter) &&
    sameEvmAddress(bound.tokenOut, contracts?.usdc)) ||
    Fail`swap configuration no longer matches on ${q(chain)}`;
  for (const token of getProtectedSwapTokens(chain, contracts)) {
    !sameEvmAddress(bound.tokenIn, token) ||
      Fail`swap tokenIn ${q(bound.tokenIn)} is a protected token of ${q(chain)}`;
  }
};
harden(assertRewardBinding);
