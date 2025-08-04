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
import { AmountMath, type NatAmount, type NatValue } from '@agoric/ertp';
import type { InvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import type { Instance } from '@agoric/zoe';
import { Fail } from '@endo/errors';
import { objectMap } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import type { AxelarChain, YieldProtocol } from '../src/constants.js';
import { type start } from '../src/portfolio.contract.js';
import type { MovementDesc } from '../src/type-guards-steps.js';
import {
  makePositionPath,
  portfolioIdOfPath,
  type OfferArgsFor,
  type PortfolioContinuingInvitationMaker,
  type PortfolioInvitationMaker,
  type ProposalType,
  type StatusFor,
} from '../src/type-guards.js';
import type { WalletTool } from './wallet-offer-tools.js';
import { NonNullish } from '@agoric/internal';

const { fromEntries } = Object;
const range = (n: number) => [...Array(n).keys()];

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
 * @returns Trader object with methods for portfolio operations
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
  let openId: string | undefined = undefined;
  let portfolioPath: string | undefined = undefined;

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
    getPortfolioId: () =>
      portfolioIdOfPath(self.getPortfolioPath().replace(/^orchtest\./, '')),
    getPortfolioPath: () => portfolioPath || assert.fail('no portfolio'),
    getPortfolioStatus: () =>
      readPublished(
        self.getPortfolioPath().replace(/^orchtest\./, ''),
      ) as Promise<StatusFor['portfolio']>,
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
      case 'Beefy':
        // For Beefy, we need to specify the chain (e.g., Avalanche)
        const beefyChain = 'Avalanche'; // Default to Avalanche for Beefy
        steps.push({
          src: '@noble',
          dest: `@${beefyChain}`,
          amount,
          fee: fees[p].Account,
        });
        steps.push({
          src: `@${beefyChain}`,
          dest: `${p}_re7_${beefyChain}`,
          amount,
          fee: fees[p].Call,
        });
        break;
      case 'Yearn':
        // For Yearn, we can use either Ethereum or Polygon
        const yearnChain = 'Polygon'; // Default to Polygon for this test
        steps.push({
          src: '@noble',
          dest: `@${yearnChain}`,
          amount,
          fee: fees[p].Account,
        });
        steps.push({
          src: `@${yearnChain}`,
          dest: `${p}_usdc_${yearnChain}`,
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
