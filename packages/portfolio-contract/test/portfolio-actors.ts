import type { Amount } from '@agoric/ertp';
import type { Instance } from '@agoric/zoe';
import type { ExecutionContext } from 'ava';
import type { YieldProtocol } from '../src/constants.js';
import { type start } from '../src/portfolio.contract.ts';
import type { WalletTool } from './wallet-offer-tools.ts';
import type { AxelarGas, EVMOfferArgs } from '../src/type-guards.ts';

export const makeTrader = (
  wallet: WalletTool,
  instance: Instance<typeof start>,
) => {
  let nonce = 0;
  return harden({
    async openPortfolio(
      t: ExecutionContext,
      give: Partial<
        Record<YieldProtocol | keyof typeof AxelarGas, Amount<'nat'>>
      >,
      offerArgs: EVMOfferArgs = harden({}),
    ) {
      const invitationSpec = {
        source: 'contract' as const,
        instance,
        publicInvitationMaker: 'makeOpenPortfolioInvitation' as const,
      };
      t.log('I ask the portfolio manager to allocate', give);
      const proposal = { give };
      return wallet.executeOffer({
        id: `openP-${(nonce += 1)}`,
        invitationSpec,
        proposal,
        offerArgs,
      });
    },
  });
};
