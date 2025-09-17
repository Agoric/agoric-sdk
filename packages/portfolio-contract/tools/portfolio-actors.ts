/**
 * @file Test actors demonstrating the portfolio contract's two-phase offer flow.
 *
 * This file provides example usage of the client interaction patterns
 * for the contract. The {@link makeTrader} function shows how client developers
 * should implement portfolio management in their applications.
 *
 * **Phase 1 Example**: {@link makeTrader.openPortfolio} - Initial portfolio creation
 * **Phase 2 Example**: {@link makeTrader.rebalance} - Ongoing position management
 *
 * @see type-guards.ts for the authoritative interface specification
 */
import { type VstorageKit } from '@agoric/client-utils';
import {
  AmountMath,
  type Amount,
  type Brand,
  type NatAmount,
  type NatValue,
} from '@agoric/ertp';
import { NonNullish } from '@agoric/internal';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import type { InvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import type { Instance } from '@agoric/zoe';
import { Fail } from '@endo/errors';
import { objectMap } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import type {
  AxelarChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import { type start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import type {
  AssetPlaceRef,
  MovementDesc,
} from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import {
  makePositionPath,
  portfolioIdOfPath,
  type OfferArgsFor,
  type PortfolioContinuingInvitationMaker,
  type PortfolioInvitationMaker,
  type ProposalType,
  type StatusFor,
  type PoolKey,
  type TargetAllocation,
  PoolPlaces,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import type { WalletTool } from '@aglocal/portfolio-contract/tools/wallet-offer-tools.js';

const { fromEntries } = Object;

assert.equal(ROOT_STORAGE_PATH, 'orchtest');
const stripRoot = (path: string) => path.replace(/^orchtest\./, '');

export const makePortfolioQuery = (
  readPublished: VstorageKit['readPublished'],
  portfolioKey: `${string}.portfolios.portfolio${number}`,
) => {
  const self = harden({
    getPortfolioStatus: () =>
      readPublished(portfolioKey) as Promise<StatusFor['portfolio']>,
    getPositionPaths: async () => {
      const { positionKeys } = await self.getPortfolioStatus();
      return positionKeys.map(key => `${portfolioKey}.positions.${key}`);
    },
    getPositionStatus: (key: PoolKey) =>
      readPublished(`${portfolioKey}.positions.${key}`) as Promise<
        StatusFor['position']
      >,
  });
  return self;
};

/**
 * Creates a trader object for testing portfolio contract interactions.
 *
 * This function demonstrates the client interaction patterns that web developers
 * need to implement when building UIs for the portfolio contract. The methods
 * here show how to:
 * - Connect to wallets and make offers (similar to `@agoric/react-components` `makeOffer`)
 * - Read chain state via vstorage (similar to `chainStorageWatcher`)
 * - Handle continuing offers for rebalancing operations
 *
 * Web developers can use this as a reference implementation when building
 * clients with `@agoric/react-components`, `@agoric/rpc`, and related UI libraries.
 *
 * @param wallet - WalletTool for executing offers (analogous to wallet connection in web UIs)
 * @param instance - Portfolio contract instance (obtained via chainStorageWatcher in web UIs)
 * @param readPublished - Function to read vstorage data (analogous to chainStorageWatcher)
 * returns Trader object with methods for portfolio operations
 *
 * @example
 * // In a web client, similar patterns would use:
 * // const { makeOffer, chainStorageWatcher } = useAgoric();
 * // const trader = makeTrader(walletTool, contractInstance, chainStorageWatcher.readLatest);
 */
export const makeTrader = (
  wallet: WalletTool,
  instance: Instance<typeof start>,
  readPublished: VstorageKit['readPublished'] = () =>
    assert.fail('no vstorage access'),
) => {
  let nonce = 0;
  let openId: string | undefined;
  let portfolioPath: string | undefined;

  const { brand: accessBrand } = wallet.getAssets().Access;
  const Access = AmountMath.make(accessBrand, 1n);

  const self = harden({
    /**
     * **Phase 1**: Opens a new portfolio with initial funding.
     *
     * Demonstrates the public invitation flow where clients:
     * 1. Get invitation from contract's public facet
     * 2. Provide USDC, Access tokens, and optional protocol allocations
     * 3. Receive continuing invitation makers for future operations
     *
     * This is the entry point to the portfolio management system.
     */
    async openPortfolio(
      t: ExecutionContext,
      give: ProposalType['openPortfolio']['give'],
      offerArgs: OfferArgsFor['openPortfolio'] = {},
    ) {
      if (portfolioPath !== undefined) throw Error('already opened');
      if (openId) throw Error('already opening');

      const publicInvitationMaker: PortfolioInvitationMaker =
        'makeOpenPortfolioInvitation';

      const invitationSpec = {
        source: 'contract' as const,
        instance,
        publicInvitationMaker,
      };
      t.log('I ask the portfolio manager to allocate', give);
      const proposal = { give: { Access, ...give } };
      openId = `openP-${(nonce += 1)}`;
      const doneP = wallet.executePublicOffer({
        id: openId,
        invitationSpec,
        proposal,
        offerArgs,
      });
      return doneP.then(({ result, payouts }) => {
        const { portfolio: topic } = result.publicSubscribers;
        if (topic.description === 'Portfolio') {
          portfolioPath = topic.storagePath!;
        }
        return { result, payouts };
      });
    },
    /**
     * **Phase 2**: Rebalances portfolio positions between yield protocols.
     *
     * Demonstrates the continuing invitation flow where clients:
     * 1. Use invitation makers from previous portfolio opening
     * 2. Specify asset movements between USDN, Aave, and Compound
     * 3. Execute cross-chain operations via Noble and Axelar GMP
     *
     * This enables ongoing portfolio management after initial creation.
     */
    async rebalance(
      t: ExecutionContext,
      proposal: ProposalType['rebalance'],
      offerArgs: OfferArgsFor['rebalance'],
    ) {
      if (!openId) throw Error('not open');
      const invitationMakerName: PortfolioContinuingInvitationMaker =
        'Rebalance';
      const id = `rebalance-${(nonce += 1)}`;
      const invitationSpec: InvitationSpec = {
        source: 'continuing' as const,
        invitationMakerName,
        previousOffer: openId,
      };

      return wallet.executeContinuingOffer({
        id,
        invitationSpec,
        proposal,
        offerArgs,
      });
    },
    getPortfolioId: () => portfolioIdOfPath(stripRoot(self.getPortfolioPath())),
    getPortfolioPath: () => portfolioPath || assert.fail('no portfolio'),
    getPortfolioStatus: () =>
      readPublished(stripRoot(self.getPortfolioPath())) as Promise<
        StatusFor['portfolio']
      >,
    getPositionPaths: async () => {
      const { positionKeys } = await self.getPortfolioStatus();

      // XXX why do we have to add 'portfolios'?
      return positionKeys.map(key =>
        ['portfolios', ...makePositionPath(self.getPortfolioId(), key)].join(
          '.',
        ),
      );
    },
    netTransfersByPosition: async () => {
      const paths = await self.getPositionPaths();
      const positionStatuses = await Promise.all(
        paths.map(
          path => readPublished(path) as Promise<StatusFor['position']>,
        ),
      );
      return fromEntries(
        positionStatuses.map(info => [info.protocol, info.netTransfers]),
      );
    },
  });
  return self;
};

const { entries, values } = Object;
const { add, make } = AmountMath;
const amountSum = <A extends Amount>(amounts: A[]) =>
  amounts.reduce((acc, v) => add(acc, v));

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

/**
 * Compute a breakdown of `deposit` into amounts
 * to send to positions so that the resulting position balances are as close
 * to targetAllocation as possible.
 */
export const planDepositTransfers = (
  deposit: NatAmount,
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>,
  targetAllocation: TargetAllocation,
): Partial<Record<PoolKey, NatAmount>> => {
  const { brand } = deposit;
  const depositValue = deposit.value;

  // Calculate total current value across all positions
  const totalCurrent = Object.values(currentBalances).reduce(
    (sum, amount) => sum + (amount?.value || 0n),
    0n,
  );

  // Total value after deposit
  const totalAfterDeposit = totalCurrent + depositValue;

  // Calculate target amounts for each position
  const transfers: Partial<Record<PoolKey, NatAmount>> = {};

  for (const [poolKey, targetPercent] of Object.entries(targetAllocation)) {
    const currentAmount = currentBalances[poolKey as PoolKey]?.value || 0n;
    const targetAmount = (totalAfterDeposit * BigInt(targetPercent)) / 100n;
    const transferAmount = targetAmount - currentAmount;

    if (transferAmount > 0n) {
      transfers[poolKey as PoolKey] = make(brand, transferAmount);
    }
  }

  // Ensure we don't exceed the deposit amount
  const totalTransfers = Object.values(transfers).reduce(
    (sum, amount) => sum + (amount?.value || 0n),
    0n,
  );

  if (totalTransfers > depositValue) {
    // Scale down proportionally if we exceed the deposit
    for (const [poolKey, amount] of Object.entries(transfers)) {
      if (amount) {
        transfers[poolKey as PoolKey] = make(
          brand,
          (amount.value * depositValue) / totalTransfers,
        );
      }
    }
  }

  return transfers;
};

export const planTransfer = (
  dest: PoolKey,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
): MovementDesc[] => {
  const { protocol: p, chainName: evm } = PoolPlaces[dest];
  const steps: MovementDesc[] = [];

  switch (p) {
    case 'USDN': {
      const detail = { usdnOut: ((amount.value || 0n) * 99n) / 100n };
      console.warn('TODO: client should query exchange rate');
      steps.push({ src: '@noble', dest: 'USDNVault', amount, detail });
      break;
    }
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
        detail: {
          evmGas: 200000000000000n,
        }
      });
      console.warn('TODO: stop hard-coding fees!');
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
  return harden(steps);
};
