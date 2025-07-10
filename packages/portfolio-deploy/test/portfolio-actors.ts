import type { InvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import type { Instance } from '@agoric/zoe';
import type { ExecutionContext } from 'ava';
import { type start } from '../../../packages/portfolio-contract/src/portfolio.contract.ts';
import type {
  OfferArgsFor,
  OpenPortfolioGive,
  ProposalType,
} from '../../../packages/portfolio-contract/src/type-guards.ts';
import { AmountMath } from '@agoric/ertp';

const { fromEntries } = Object;
const range = (n: number) => [...Array(n).keys()];

// XXX: fix types at some point
export const makeTrader = (
  wallet: any,
  instance: Instance<typeof start>,
  accessBrand: any,
) => {
  let nonce = 0;
  let openId: string | undefined = undefined;
  let portfolioPath: string = `published.ymax0.portfolioN`;

  // const { brand: accessBrand } = wallet.getAssets().Access;
  const Access = AmountMath.make(accessBrand, 1n);

  const self = harden({
    async openPortfolio(
      t: ExecutionContext,
      give: OpenPortfolioGive,
      offerArgs: OfferArgsFor['openPortfolio'] = {},
    ) {
      // TODO: uncomment below lines at some point
      // if (portfolioPath) throw Error('already opened');
      // if (openId) throw Error('already opening');

      const invitationSpec = {
        source: 'contract' as const,
        instance,
        publicInvitationMaker: 'makeOpenPortfolioInvitation' as const,
      };
      t.log('I ask the portfolio manager to allocate', give);
      const proposal = { give: { Access, ...give } };
      openId = `openP-${(nonce += 1)}`;
      const doneP = wallet.executeOffer({
        id: openId,
        invitationSpec,
        proposal,
        offerArgs,
      });
      doneP.then(obj => {
        // TODO: uncomment below lines at some point
        // const { result } = obj;
        // const { portfolio: topic } = result.publicSubscribers;
        // if (topic.description === 'Portfolio') {
        //   portfolioPath = topic.storagePath;
        // }
      });
      return doneP;
    },
    async rebalance(
      t: ExecutionContext,
      proposal: ProposalType['rebalance'],
      offerArgs: OfferArgsFor['rebalance'],
    ) {
      if (!openId) throw Error('not open');
      const id = `rebalance-${(nonce += 1)}`;
      const invitationSpec: InvitationSpec = {
        source: 'continuing' as const,
        invitationMakerName: 'Rebalance' as const,
        previousOffer: openId,
      };

      return wallet.executeOffer({
        id: openId,
        invitationSpec,
        proposal,
        offerArgs,
      });
    },
    getPortfolioPath: () => portfolioPath,
    getPortfolioStatus: storage => {
      // TODO: typed pattern for portfolio status
      return storage.getDeserialized(portfolioPath).at(-1) as any;
    },
    getPositionPaths: storage => {
      const { positionCount } = self.getPortfolioStatus(storage);

      return range(positionCount).map(
        pIx => `${portfolioPath}.positions.position${pIx + 1}`,
      );
    },
    netTransfersByProtocol: storage => {
      const posPaths = self.getPositionPaths(storage);
      return fromEntries(
        posPaths
          .map(path => storage.getDeserialized(path).at(-1) as any)
          .map(info => [info.protocol, info.netTransfers]),
      );
    },
  });
  return self;
};
