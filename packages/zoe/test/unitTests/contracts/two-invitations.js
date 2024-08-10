import { M } from '@endo/patterns';
import { makeExo } from '@endo/exo';

/**
 * This contract just provides two invitations to support the test in
 * test-invitation-details.js
 *
 * @type {ContractStartFn}
 */
export const start = zcf => {
  return harden({
    creatorFacet: makeExo(
      'TwoInvitations',
      M.interface('TwoInvitations', {
        get1: M.callWhen().returns(M.remotable('Invitation')),
        get2: M.callWhen().returns(M.remotable('Invitation')),
      }),
      {
        get1() {
          return zcf.makeInvitation(() => null, 'invite1', harden({ i: 1 }));
        },
        get2() {
          return zcf.makeInvitation(() => null, 'invite2', harden({ i: 2 }));
        },
      },
    ),
  });
};
harden(start);
