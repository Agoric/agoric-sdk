import type { VStorage } from '@agoric/client-utils';
import type { SmartWallet } from '@agoric/smart-wallet/src/smartWallet';
import { E } from '@endo/far';
import type { start as startYMax } from '../src/portfolio.contract.js';
import type { MovementDesc } from '../src/type-guards-steps.js';

export const plannerClientMock = (
  wallet: SmartWallet,
  instance: Instance<typeof startYMax>,
  readAt: VStorage['readAt'],
) => {
  const offersP = E(wallet).getOffersFacet();
  const redeem = async () => {
    await E(offersP).executeOffer({
      id: 'redeem-1',
      invitationSpec: {
        source: 'purse',
        instance,
        description: 'planner',
      },
      proposal: {},
      saveResult: { name: 'planner' },
    });
  };

  const invokeP = E(wallet).getInvokeFacet();
  const submit1 = async () => {
    const portfolioId = 0;
    const plan: MovementDesc[] = [];
    await E(invokeP).invokeEntry({
      targetName: 'planner',
      method: 'submit',
      args: [portfolioId, plan],
    });
  };
  console.log('TODO: wait for invoke result');

  return harden({ redeem, submit1 });
};
