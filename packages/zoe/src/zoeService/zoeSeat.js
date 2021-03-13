// @ts-check

import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

export const makeZoeSeatAdminKit = (
  initialAllocation,
  instanceAdmin,
  proposal,
  brandToPurse,
  exitObj,
  offerResult,
) => {
  const payoutPromiseKit = makePromiseKit();
  // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
  // This does not suppress any error messages.
  payoutPromiseKit.promise.catch(_ => {});

  const doExit = zoeSeatAdmin => {
    instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);
    payoutPromiseKit.resolve('done');
  };

  const zoeSeatAdmin = Far('zoeSeatAdmin', {
    exit: _reason => {
      doExit(zoeSeatAdmin);
    },
  });

  const userSeat = Far('userSeat', {
    getOfferResult: async () => offerResult,
  });

  return { userSeat, zoeSeatAdmin };
};
