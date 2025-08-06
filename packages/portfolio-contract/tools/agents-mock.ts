import type { VStorage, VstorageKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { SmartWallet } from '@agoric/smart-wallet/src/smartWallet';
import type { start as startYMax } from '../src/portfolio.contract.js';

import { E } from '@endo/far';
import type { MovementDesc } from '../src/type-guards-steps.js';

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

export const fakePlanner = (
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
      after: { saveAs: 'planner' },
    });
  };

  const invokeP = E(wallet).getInvokeFacet();
  const submit1 = async () => {
    const portfolioId = 1;
    const plan: MovementDesc[] = [];
    await E(invokeP).invokeItem('planner', {
      method: 'submit',
      args: [portfolioId, plan],
    });
  };

  return harden({ redeem, submit1 });
};

export const makeResolver = (
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
        description: 'resolver',
        instance,
      },
      proposal: {},
      after: { saveAs: 'priceSetter' },
    });
  };

  return harden({ redeem });
};
