// @ts-check

import { makePromiseKit } from '@endo/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { vivifyFarClassKit, M } from '@agoric/vat-data';

import { satisfiesWant } from '../contractFacet/offerSafety.js';

import '../types.js';
import '../internal-types.js';
import {
  AmountKeywordRecordShape,
  KeywordShape,
  NotifierShape,
} from '../typeGuards.js';

const ZoeSeatGuard = {
  zoeSeatAdmin: M.interface('ZoeSeatAdmin', {
    replaceAllocation: M.call(AmountKeywordRecordShape).returns(),
    exit: M.call(M.any()).returns(),
    fail: M.call(M.any()).returns(),
    getNotifier: M.call().returns(NotifierShape),
    resolveExitAndResult: M.call(M.promise(), M.remotable()).returns(),
  }),
  userSeat: M.interface('UserSeat', {
    getProposal: M.call().returns(M.promise()),
    getPayouts: M.call().returns(M.promise()),
    getPayout: M.call(KeywordShape).returns(M.promise()),
    getOfferResult: M.call().returns(M.promise()),
    hasExited: M.call().returns(M.promise()),
    tryExit: M.call().returns(M.promise()),
    numWantsSatisfied: M.call().returns(M.promise()),
    // deprecated. See
    // https://github.com/Agoric/agoric-sdk/issues/5833 and
    // https://github.com/Agoric/agoric-sdk/issues/5834
    getCurrentAllocationJig: M.call().returns(M.promise()),
    getAllocationNotifierJig: M.call().returns(M.promise()),
    getFinalAllocation: M.call().returns(M.promise()),
  }),
};

/**
 * makeZoeSeatAdminFactory returns a maker for an object that manages the state
 * of a seat participating in a Zoe contract and return its two facets.
 *
 * The UserSeat is suitable to be handed to an agent outside zoe and the
 * contract and allows them to query or monitor the current state, access the
 * payouts and result, and call exit() if that's allowed for this seat.
 *
 * The zoeSeatAdmin is passed by Zoe to the ContractFacet (zcf), to allow zcf to
 * query or update the allocation or exit the seat cleanly.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const makeZoeSeatAdminFactory = baggage => {
  let notifier;
  let updater;
  let payoutPromiseKit;

  // TODO(cth) these need to be moved to the seat scope
  const getNotifier = () => {
    if (!notifier) {
      ({ notifier, updater } = makeNotifierKit());
    }
    return notifier;
  };
  const getUpdater = () => {
    if (!notifier) {
      ({ notifier, updater } = makeNotifierKit());
    }
    return updater;
  };

  // TODO(cth) convert to Notifier and move to the seat scope
  const getPayoutPromiseKit = () => {
    if (!payoutPromiseKit) {
      payoutPromiseKit = makePromiseKit();
    }
    return payoutPromiseKit;
  };

  const doExit = (
    zoeSeatAdmin,
    currentAllocation,
    withdrawFacet,
    instanceAdminHelper,
  ) => {
    instanceAdminHelper.exitZoeSeatAdmin(zoeSeatAdmin);

    /** @type {PaymentPKeywordRecord} */
    const payout = withdrawFacet.withdrawPayments(currentAllocation);
    getPayoutPromiseKit().resolve(payout);
  };

  return vivifyFarClassKit(
    baggage,
    'ZoeSeatKit',
    ZoeSeatGuard,
    (
      initialAllocation,
      proposal,
      instanceAdminHelper,
      withdrawFacet,
      exitObj = undefined,
    ) => ({
      currentAllocation: initialAllocation,
      proposal,
      exitObj,
      offerResult: undefined,
      instanceAdminHelper,
      withdrawFacet,
    }),
    {
      zoeSeatAdmin: {
        replaceAllocation(replacementAllocation) {
          const { state, facets } = this;
          assert(
            !state.instanceAdminHelper.hasExited(facets.zoeSeatAdmin),
            'Cannot replace allocation. Seat has already exited',
          );
          harden(replacementAllocation);
          // Merging happens in ZCF, so replacementAllocation can
          // replace the old allocation entirely.

          // TODO (cth) notifiers
          // getUpdater().updateState(replacementAllocation);

          state.currentAllocation = replacementAllocation;
        },
        exit(reason) {
          const { state, facets } = this;
          assert(
            !state.instanceAdminHelper.hasExited(facets.zoeSeatAdmin),
            'Cannot exit seat. Seat has already exited',
          );

          // TODO (cth) notifiers
          // getUpdater().finish(reason);

          doExit(
            facets.zoeSeatAdmin,
            state.currentAllocation,
            state.withdrawFacet,
            state.instanceAdminHelper,
          );
        },
        fail(reason) {
          const { state, facets } = this;
          assert(
            !state.instanceAdminHelper.hasExited(facets.zoeSeatAdmin),
            'Cannot fail seat. Seat has already exited',
          );
          getUpdater().fail(reason);
          doExit(
            facets.zoeSeatAdmin,
            state.currentAllocation,
            state.withdrawFacet,
            state.instanceAdminHelper,
          );
        },
        getNotifier() {
          return Promise.resolve(getNotifier());
        },
        // called only for seats resulting from offers.
        resolveExitAndResult(offerResultPromise, exitObj) {
          const { state } = this;

          state.offerResult = offerResultPromise;
          state.exitObj = exitObj;
        },
      },
      userSeat: {
        async getProposal() {
          const { state } = this;
          return state.proposal;
        },
        async getPayouts() {
          const { state } = this;
          console.log(`ZSeat  getPayouts`, state.proposal);

          debugger;

          return getPayoutPromiseKit().promise;
        },
        async getPayout(keyword) {
          return E.get(getPayoutPromiseKit().promise)[keyword];
        },
        async getOfferResult() {
          const { state } = this;
          return state.offerResult;
        },
        async hasExited() {
          const { state, facets } = this;
          return state.instanceAdminHelper.hasExited(facets.zoeSeatAdmin);
        },
        async tryExit() {
          const { state } = this;
          assert(state.exitObj, 'exitObj must be initialized before use');

          return E(state.exitObj).exit();
        },
        async numWantsSatisfied() {
          const { state } = this;
          return E.when(getPayoutPromiseKit().promise, () =>
            satisfiesWant(state.proposal, state.currentAllocation),
          );
        },
        async getCurrentAllocationJig() {
          const { state } = this;
          return state.currentAllocation;
        },
        async getAllocationNotifierJig() {
          return getNotifier();
        },
        getFinalAllocation() {
          const { state } = this;
          return E.when(
            payoutPromiseKit.promise,
            () => state.currentAllocation,
          );
        },
      },
    },
    {
      finish: ({ state }) => {
        // TODO (cth) notifiers
        // getUpdater().updateState(state.currentAllocation);

        console.log(`ZoeSeat  finish`);
      },
    },
  );
};
