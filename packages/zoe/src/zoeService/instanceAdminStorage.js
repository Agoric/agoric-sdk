import {
  canBeDurable,
  makeScalarBigSetStore,
  provideDurableWeakMapStore,
  prepareKindMulti,
  prepareExoClassKit,
  M,
  provide,
} from '@agoric/vat-data';
import { E } from '@endo/eventual-send';
import { q, Fail } from '@endo/errors';
import { defineDurableHandle } from '../makeHandle.js';
import {
  BrandKeywordRecordShape,
  InstanceAdminShape,
  InstanceHandleShape,
  IssuerKeywordRecordShape,
} from '../typeGuards.js';
import { makeZoeSeatAdminFactory } from './zoeSeat.js';

/**
 * @file Two objects are defined here, both called InstanceAdminSomething.
 * InstanceAdminStorage is a container for individual InstanceAdmins. Each
 * InstanceAdmin is associated with a particular contract instance, and is used
 * by both Zoe and ZCF to record and access the instance state. startInstance
 * also defines zoeInstanceAdmin, which is a facet that is passed to startZcf()
 * that wraps access to a zoeInstanceAdmin and other stores.
 */

const InstanceAdminStorageIKit = harden({
  accessor: M.interface('InstanceAdminStorage', {
    getPublicFacet: M.callWhen(M.await(InstanceHandleShape)).returns(
      M.remotable(),
    ),
    getBrands: M.call(InstanceHandleShape).returns(BrandKeywordRecordShape),
    getIssuers: M.call(InstanceHandleShape).returns(IssuerKeywordRecordShape),
    getTerms: M.call(InstanceHandleShape).returns(M.record()),
    getOfferFilter: M.call(InstanceHandleShape).returns(M.arrayOf(M.string())),
    getInstallation: M.call(InstanceHandleShape).returns(M.remotable()),
    getInstanceAdmin: M.call(InstanceHandleShape).returns(InstanceAdminShape),
  }),
  updater: M.interface('InstanceAdmin updater', {
    initInstanceAdmin: M.call(InstanceHandleShape, InstanceAdminShape).returns(
      M.promise(),
    ),
    deleteInstanceAdmin: M.call(InstanceHandleShape).returns(),
  }),
});

/** @param {import('@agoric/vat-data').Baggage} baggage */
export const makeInstanceAdminStorage = baggage => {
  const makeIAS = prepareExoClassKit(
    baggage,
    'InstanceAdmin',
    InstanceAdminStorageIKit,
    () => ({
      instanceToInstanceAdmin: provideDurableWeakMapStore(
        baggage,
        'instanceToInstanceAdmin',
      ),
    }),
    {
      // ZoeStorageManager uses the accessor facet to get info about instances
      accessor: {
        getPublicFacet(instance) {
          const { state } = this;
          const ia = state.instanceToInstanceAdmin.get(instance);
          return ia.getPublicFacet();
        },
        getBrands(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.get(instance).getBrands();
        },
        getIssuers(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.get(instance).getIssuers();
        },
        getTerms(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.get(instance).getTerms();
        },
        getOfferFilter(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.get(instance).getOfferFilter();
        },
        getInstallation(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.get(instance).getInstallation();
        },
        getInstanceAdmin(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.get(instance);
        },
      },
      // The updater facet is only used inside the instanceStorageManager
      updater: {
        async initInstanceAdmin(instance, instanceAdmin) {
          const { state } = this;
          return state.instanceToInstanceAdmin.init(instance, instanceAdmin);
        },
        deleteInstanceAdmin(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin.delete(instance);
        },
      },
    },
  );
  return provide(baggage, 'theInstanceAdminStorage', () => makeIAS());
};
harden(makeInstanceAdminStorage);

/**
 * @param {import('@agoric/vat-data').Baggage} zoeBaggage
 * @param {ReturnType<makeZoeSeatAdminFactory>} makeZoeSeatAdminKit
 */
const makeInstanceAdminBehavior = (zoeBaggage, makeZoeSeatAdminKit) => {
  const makeSeatHandle = defineDurableHandle(zoeBaggage, 'Seat');

  return harden({
    getPublicFacet: ({ state }) => state.publicFacet,
    getTerms: ({ state }) => state.zoeInstanceStorageManager.getTerms(),
    getIssuers: ({ state }) => state.zoeInstanceStorageManager.getIssuers(),
    getBrands: ({ state }) => state.zoeInstanceStorageManager.getBrands(),

    // instanceAdmin is created early in startInstance. initDelayedState is
    // called after startZcf, but before the contract facets are made available.
    initDelayedState: ({ state }, handleOfferObj, publicFacet) => {
      state.handleOfferObj = handleOfferObj;
      canBeDurable(publicFacet) || Fail`publicFacet must be durable`;
      state.publicFacet = publicFacet;
    },
    getInstallation: ({ state }) =>
      state.zoeInstanceStorageManager.getInstallation(),
    getInstance: ({ state }) => state.instanceHandle,
    assertAcceptingOffers: ({ state }) => {
      state.acceptingOffers || Fail`No further offers are accepted`;
    },
    exitAllSeats: ({ state }, completion) => {
      state.acceptingOffers = false;
      for (const zoeSeatAdmin of state.zoeSeatAdmins.keys()) {
        zoeSeatAdmin.exit(completion);
      }
    },
    failAllSeats: ({ state }, reason) => {
      state.acceptingOffers = false;
      for (const zoeSeatAdmin of state.zoeSeatAdmins.keys()) {
        zoeSeatAdmin.fail(reason);
      }
    },
    stopAcceptingOffers: ({ state }) => {
      state.acceptingOffers = false;
    },
    makeUserSeat: (
      { state, facets: { helper } },
      invitationHandle,
      initialAllocation,
      proposal,
      offerArgs = undefined,
    ) => {
      const { userSeat, zoeSeatAdmin } = makeZoeSeatAdminKit(
        initialAllocation,
        proposal,
        helper,
        state.zoeInstanceStorageManager.getWithdrawFacet(),
      );

      const seatHandle = makeSeatHandle();
      state.seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);

      const seatData = harden({
        proposal,
        initialAllocation,
        seatHandle,
        offerArgs,
      });

      state.zoeSeatAdmins.add(zoeSeatAdmin);
      state.handleOfferObj || Fail`incomplete setup of zoe seat`;
      void E.when(
        E(state.handleOfferObj).handleOffer(invitationHandle, seatData),
        /** @param {HandleOfferResult} result */
        result => zoeSeatAdmin.resolveExitAndResult(result),
        err => {
          // nothing for Zoe to do if the termination fails
          void E(state.adminNode).terminateWithFailure(err);
          throw err;
        },
      );

      // return the userSeat before the offerHandler is called
      return userSeat;
    },
    makeNoEscrowSeat: (
      { state, facets: { helper } },
      initialAllocation,
      proposal,
      exitObj,
      seatHandle,
    ) => {
      const { userSeat, zoeSeatAdmin } = makeZoeSeatAdminKit(
        initialAllocation,
        proposal,
        helper,
        state.zoeInstanceStorageManager.getWithdrawFacet(),
        exitObj,
        true,
      );

      state.zoeSeatAdmins.add(zoeSeatAdmin);
      state.seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);
      return userSeat;
    },
    getOfferFilter: ({ state }) => state.offerFilterStrings,
    setOfferFilter: ({ state }, strings) => {
      Array.isArray(strings) || Fail`${q(strings)} must be an Array`;
      const proposedStrings = harden([...strings]);
      proposedStrings.every(s => typeof s === 'string') ||
        Fail`Blocked strings (${q(
          proposedStrings,
        )}) must be an Array of strings.`;

      state.offerFilterStrings = proposedStrings;
    },
    // If any offer filter string matches the input string, don't process the
    // invitation. Offer filter strings that end in ':' match if they are a
    // prefix of the input string; others must match it exactly.
    isBlocked: ({ state }, string) => {
      return state.offerFilterStrings.some(filterString => {
        return (
          filterString === string ||
          (filterString.endsWith(':') && string.startsWith(filterString))
        );
      });
    },
  });
};

const helperBehavior = {
  exitZoeSeatAdmin: ({ state }, zoeSeatAdmin) =>
    state.zoeSeatAdmins.delete(zoeSeatAdmin),
  hasExited: ({ state }, zoeSeatAdmin) =>
    !state.zoeSeatAdmins.has(zoeSeatAdmin),
};

/**
 * @typedef {Readonly<{
 *   publicFacet: unknown,
 *   handlerOfferObj: unknown,
 * }>} ImmutableState
 * @typedef {{
 *   offerFilterStrings: string[],
 * }} MutableState
 * @typedef {MutableState & ImmutableState} State
 * @typedef {{
 *   state: State,
 * }} MethodContext
 */

/**
 * @param {import('@agoric/vat-data').Baggage} zoeBaggage
 * @param {WeakMapStore<SeatHandle, ZoeSeatAdmin>} seatHandleToZoeSeatAdmin
 */
export const makeInstanceAdminMaker = (
  zoeBaggage,
  seatHandleToZoeSeatAdmin,
) => {
  const makeZoeSeatAdminKit = makeZoeSeatAdminFactory(zoeBaggage);
  const makeInstanceAdminMulti = prepareKindMulti(
    zoeBaggage,
    'instanceAdmin',
    (instanceHandle, zoeInstanceStorageManager, adminNode) => {
      const retVal = {
        offerFilterStrings: harden([]),
        publicFacet: undefined,
        handleOfferObj: undefined,
        zoeInstanceStorageManager,
        seatHandleToZoeSeatAdmin,
        instanceHandle,
        acceptingOffers: true,
        zoeSeatAdmins: makeScalarBigSetStore('zoeSeatAdmins', {
          durable: true,
        }),
        adminNode,
      };
      return retVal;
    },
    {
      instanceAdmin: makeInstanceAdminBehavior(zoeBaggage, makeZoeSeatAdminKit),
      helper: helperBehavior,
    },
  );

  return (instanceHandle, zoeInstanceStorageManager, adminNode) => {
    const instanceAdmin = makeInstanceAdminMulti(
      instanceHandle,
      zoeInstanceStorageManager,
      adminNode,
    ).instanceAdmin;
    return instanceAdmin;
  };
};

harden(makeInstanceAdminMaker);
