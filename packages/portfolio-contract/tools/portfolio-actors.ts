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
import { AmountMath } from '@agoric/ertp';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import type { InvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import type { Instance } from '@agoric/zoe';
import type { ExecutionContext } from 'ava';
import { type start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import {
  makePositionPath,
  portfolioIdOfPath,
  type OfferArgsFor,
  type PortfolioContinuingInvitationMaker,
  type PortfolioInvitationMaker,
  type ProposalType,
  type StatusFor,
  type PoolKey,
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
