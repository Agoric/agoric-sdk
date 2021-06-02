// @ts-check

import { E } from '@agoric/eventual-send';

import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { cleanProposal } from '../cleanProposal';

import { makeExitObj } from './exit';
import { makeHandle } from '../makeHandle';
import { handlePKitWarning } from '../handleWarning';

export const setupMakeEmptySeatKit = (
  zoeInstanceAdmin,
  makeZCFSeat,
  getAssetKindByBrand,
) => {
  const makeEmptySeatKit = (exit = undefined) => {
    const initialAllocation = harden({});
    const proposal = cleanProposal(harden({ exit }), getAssetKindByBrand);
    const { notifier, updater } = makeNotifierKit();
    /** @type {PromiseRecord<ZoeSeatAdmin>} */
    const zoeSeatAdminPromiseKit = makePromiseKit();
    handlePKitWarning(zoeSeatAdminPromiseKit);
    const userSeatPromiseKit = makePromiseKit();
    handlePKitWarning(userSeatPromiseKit);
    const seatHandle = makeHandle('SeatHandle');

    const seatData = harden({
      proposal,
      initialAllocation,
      notifier,
      seatHandle,
    });
    const zcfSeat = makeZCFSeat(zoeSeatAdminPromiseKit.promise, seatData);

    const exitObj = makeExitObj(seatData.proposal, zcfSeat);

    E(zoeInstanceAdmin)
      .makeNoEscrowSeat(initialAllocation, proposal, exitObj, seatHandle)
      .then(({ zoeSeatAdmin, notifier: zoeNotifier, userSeat }) => {
        observeNotifier(zoeNotifier, updater);
        zoeSeatAdminPromiseKit.resolve(zoeSeatAdmin);
        userSeatPromiseKit.resolve(userSeat);
      });

    return { zcfSeat, userSeat: userSeatPromiseKit.promise };
  };
  return makeEmptySeatKit;
};
