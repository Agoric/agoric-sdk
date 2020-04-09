// @ts-check
import rawHarden from '@agoric/harden';

// TODO: Until we have a version of harden that exports its type.
const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * This is a very trivial contract to explain and test Zoe.
 * AutomaticRefund just gives you back what you put in. It has one
 * method: `makeOffer`. AutomaticRefund then tells Zoe to complete the
 * offer, which gives the user their payout through Zoe. Other
 * contracts will use these same steps, but they will have more
 * sophisticated logic and interfaces.
 * @type {import('@agoric/zoe').MakeContract} zoe - the contract facet of zoe
 */
export const makeContract = harden(zoe => {
  let offersCount = 0;
  const makeSeatInvite = () => {
    const seat = harden({
      makeOffer: () => {
        offersCount += 1;
        // eslint-disable-next-line no-use-before-define
        zoe.complete(harden([inviteHandle]));
        return `The offer was accepted`;
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'getRefund',
    });
    return invite;
  };
  return harden({
    invite: makeSeatInvite(),
    publicAPI: {
      getOffersCount: () => offersCount,
      makeInvite: makeSeatInvite,
    },
  });
});
