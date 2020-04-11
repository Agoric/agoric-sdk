// @ts-check
import harden from '@agoric/harden';

/**
 * This is a a broken contact to test zoe's error handling
 * @type {import('@agoric/zoe').MakeContract} zoe - the contract facet of zoe
 */
export const makeContract = harden(zoe => {
  const makeSeatInvite = () => {
    const seat = harden({
      makeOffer: () => {
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
    // should be makeSeatInvite(). Intentionally wrong to provoke an error.
    invite: makeSeatInvite,
    publicAPI: {},
  });
});
