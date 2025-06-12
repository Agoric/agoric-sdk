import { Far } from '@endo/marshal';

/**
 * @import {ContractStartFn} from '../../../src/contractFacet/types.js';
 */

/**
 * This is a a broken contact to test zoe's error handling
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  const refund = seat => {
    seat.exit();
    return `The offer was accepted`;
  };
  // The Far would not normally happen in the erroneous accident
  // we're "testing". However, if we omit it, we get a completely
  // different error which is besides the point of this test.
  const makeRefundInvitation = Far('broken make refund', () =>
    zcf.makeInvitation(refund, 'getRefund'),
  );
  // should be makeRefundInvitation(). Intentionally wrong to provoke
  // an error.
  // @ts-expect-error invalid arguments for testing
  return { creatorInvitation: makeRefundInvitation };
};

harden(start);
export { start };
