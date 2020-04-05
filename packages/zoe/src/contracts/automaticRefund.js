import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

/**
 * This is a very trivial contract to explain and test Zoe.
 * AutomaticRefund just gives you back what you put in.
 * AutomaticRefund tells Zoe to complete the
 * offer, which gives the user their payout through Zoe. Other
 * contracts will use these same steps, but they will have more
 * sophisticated logic and interfaces.
 * @param {contractFacet} zoe - the contract facet of zoe
 */
export const makeContract = harden(zoe => {
  const { makeInvite } = makeZoeHelpers(zoe);

  let offersCount = 0;
  const makeSeatInvite = () =>
    makeInvite(
      inviteHandle => {
        offersCount += 1;
        zoe.complete(harden([inviteHandle]));
        return `The offer was accepted`;
      },
      {
        seatDesc: 'getRefund',
      },
    );

  return harden({
    invite: makeSeatInvite(),
    publicAPI: {
      getOffersCount: () => offersCount,
      makeInvite: makeSeatInvite,
    },
  });
});
