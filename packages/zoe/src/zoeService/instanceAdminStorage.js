import { E } from '@endo/eventual-send';
import {
  canBeDurable,
  makeScalarBigSetStore,
  provideDurableWeakMapStore,
  vivifyKindMulti,
  vivifyFarClassKit,
  M,
  provide,
} from '@agoric/vat-data';
import { makeZoeSeatAdminFactory } from './zoeSeat.js';
import { defineDurableHandle } from '../makeHandle.js';
import {
  BrandKeywordRecordShape,
  InstanceAdminShape,
  InstanceHandleShape,
  IssuerKeywordRecordShape,
} from '../typeGuards.js';

const { quote: q, details: X } = assert;

const InstanceAdminStorageIKit = harden({
  accessor: M.interface('InstanceAdminStorage', {
    getPublicFacet: M.callWhen(M.await(InstanceHandleShape)).returns(
      M.remotable(),
    ),
    getBrands: M.call(InstanceHandleShape).returns(BrandKeywordRecordShape),
    getIssuers: M.call(InstanceHandleShape).returns(IssuerKeywordRecordShape),
    getTerms: M.call(InstanceHandleShape).returns(M.record()),
    getOfferFilter: M.call(InstanceHandleShape).returns(M.arrayOf(M.string())),
    getInstallationForInstance: M.call(InstanceHandleShape).returns(
      M.remotable(),
    ),
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
  const makeIAS = vivifyFarClassKit(
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
        getInstallationForInstance(instance) {
          const { state } = this;
          return state.instanceToInstanceAdmin
            .get(instance)
            .getInstallationForInstance();
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
      assert(canBeDurable(publicFacet), 'publicFacet must be durable');
      state.publicFacet = publicFacet;
    },
    getInstallationForInstance: ({ state }) =>
      state.zoeInstanceStorageManager.getInstallationForInstance(),
    getInstance: ({ state }) => state.instanceHandle,
    assertAcceptingOffers: ({ state }) => {
      assert(state.acceptingOffers, `No further offers are accepted`);
    },
    exitAllSeats: ({ state }, completion) => {
      state.acceptingOffers = false;
      Array.from(state.zoeSeatAdmins.keys()).forEach(zoeSeatAdmin =>
        zoeSeatAdmin.exit(completion),
      );
    },
    failAllSeats: ({ state }, reason) => {
      state.acceptingOffers = false;
      Array.from(state.zoeSeatAdmins.keys()).forEach(zoeSeatAdmin =>
        zoeSeatAdmin.fail(reason),
      );
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
      assert(state.handleOfferObj, 'incomplete setup of zoe seat');
      E.when(
        E(state.handleOfferObj).handleOffer(invitationHandle, seatData),
        ({ offerResultPromise, exitObj }) =>
          zoeSeatAdmin.resolveExitAndResult(offerResultPromise, exitObj),
        err => {
          state.adminNode.terminateWithFailure(err);
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
      return { userSeat };
    },
    getOfferFilter: ({ state }) => state.offerFilterStrings,
    setOfferFilter: ({ state }, strings) => {
      assert(Array.isArray(strings), X`${q(strings)} must be an Array`);
      const proposedStrings = harden([...strings]);
      assert(
        proposedStrings.every(s => typeof s === 'string'),
        X`Blocked strings (${q(proposedStrings)}) must be an Array of strings.`,
      );

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
 * @param {WeakStore<SeatHandle, ZoeSeatAdmin>} seatHandleToZoeSeatAdmin
 */
export const makeInstanceAdminMaker = (
  zoeBaggage,
  seatHandleToZoeSeatAdmin,
) => {
  const makeZoeSeatAdminKit = makeZoeSeatAdminFactory(zoeBaggage);
  const makeInstanceAdminMulti = vivifyKindMulti(
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
