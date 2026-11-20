/**
 * @file Reward claim and swap steps bound to the signed evidence they
 * select, and their re-check against configuration at execution.
 * @see {@link assertRewardBinding}
 */
import { sameEvmAddress } from '@agoric/orchestration/src/utils/address.js';
import type {
  EvmAccountRef,
  HexBytes,
  InstrumentId,
  MovementDesc,
} from '@agoric/portfolio-api';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { evmChainOf, PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import { Fail, q } from '@endo/errors';
import type { Address as EvmAddress } from 'abitype';
import type { EVMContractAddresses } from './portfolio.contract.ts';

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
