// @ts-check

import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

export const makeZoeSeatAdminKit = (instanceAdmin, offerResult) => {
  const payoutPromiseKit = makePromiseKit();

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
