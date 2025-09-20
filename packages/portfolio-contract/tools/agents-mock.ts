import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type {
  SmartWallet,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet';
import { E } from '@endo/far';
import type { start as startYMax } from '../src/portfolio.contract.js';
import type { MovementDesc } from '../src/type-guards-steps.js';

export const plannerClientMock = (
  wallet: SmartWallet,
  instance: Instance<typeof startYMax>,
  getLastUpdate: () => Promise<UpdateRecord>,
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
  let id = 0;
  const submit = async (
    portfolioId = 0,
    plan: MovementDesc[] = [],
    policyVersion = 0,
    rebalanceCount = 0,
  ) => {
    id += 1;
    await E(invokeP).invokeEntry({
      id,
      targetName: 'planner',
      method: 'submit',
      args: [portfolioId, plan, policyVersion, rebalanceCount],
    });
    await eventLoopIteration();
    const update = await getLastUpdate();
    assert.equal(update.updated, 'invocation', 'limited mock');
    assert.equal(update.id, id, 'limited mock');
    if (update.error) throw Error(update.error);
  };

  return harden({ redeem, submit });
};
