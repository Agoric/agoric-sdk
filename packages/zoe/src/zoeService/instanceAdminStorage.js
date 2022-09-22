// @ts-check

import { E } from '@endo/eventual-send';
import {
  makeScalarBigSetStore,
  provideDurableSetStore,
  provideDurableWeakMapStore,
  // provideDurableMapStore,
  vivifyKindMulti,
} from '@agoric/vat-data';
import { makePromiseKit } from '@endo/promise-kit';
import { handlePKitWarning } from '../handleWarning.js';
import { makeZoeSeatAdminKit } from './zoeSeat.js';
import { makeHandle } from '../makeHandle.js';

const { quote: q, details: X } = assert;

/** @param {import('@agoric/vat-data').Baggage} baggage */
export const makeInstanceAdminStorage = baggage => {
  /** @type {WeakStore<Instance,InstanceAdmin>} */
  const instanceToInstanceAdmin = provideDurableWeakMapStore(
    baggage,
    'instanceToInstanceAdmin',
  );
  /** @type {GetPublicFacet} */
  const getPublicFacet = async instanceP =>
    E.when(instanceP, async instance => {
      const ia = instanceToInstanceAdmin.get(instance);
      return ia.getPublicFacet();
    });

  /** @type {GetBrands} */
  const getBrands = async instance =>
    instanceToInstanceAdmin.get(instance).getBrands();

  /** @type {GetIssuers} */
  const getIssuers = async instance =>
    instanceToInstanceAdmin.get(instance).getIssuers();

  /** @type {GetTerms} */
  const getTerms = instance => instanceToInstanceAdmin.get(instance).getTerms();

  /** @type {GetOfferFilter} */
  const getOfferFilter = async instanceP =>
    E.when(instanceP, instance =>
      instanceToInstanceAdmin.get(instance).getOfferFilter(),
    );

  /** @type {GetInstallationForInstance} */
  const getInstallationForInstance = async instance =>
    instanceToInstanceAdmin.get(instance).getInstallationForInstance();

  return harden({
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getOfferFilter,
    getInstallationForInstance,
    getInstanceAdmin: instanceToInstanceAdmin.get,
    initInstanceAdmin: async (x, y) => instanceToInstanceAdmin.init(x, y),
    deleteInstanceAdmin: instanceToInstanceAdmin.delete,
  });
};
harden(makeInstanceAdminStorage);

const instanceAdminBehavior = {
  getPublicFacet: ({ state }) => state.publicFacet,
  getTerms: ({ state }) => state.zoeInstanceStorageManager.getTerms(),
  getIssuers: ({ state }) => state.zoeInstanceStorageManager.getIssuers(),
  getBrands: ({ state }) => state.zoeInstanceStorageManager.getBrands(),
  initHandlerObj: ({ state }, handleOfferObj) =>
    (state.handleOfferObj = handleOfferObj),
  getInstallationForInstance: ({ state }) =>
    state.zoeInstanceStorageManager.getInstallationForInstance(),
  getInstance: ({ state }) => state.instanceHandle,
  assertAcceptingOffers: ({ state }) => {
    assert(state.acceptingOffers, `No further offers are accepted`);
  },
  exitAllSeats: ({ state }, completion) => {
    state.acceptingOffers = false;
    console.log(
      `IAS  ExitAll len: ${Array.from(state.zoeSeatAdmins.keys()).length}`,
      state.instanceID,
    );
    Array.from(state.zoeSeatAdmins.keys()).forEach(zoeSeatAdmin => {
      console.log(`IAS ExitAll  ${zoeSeatAdmin.getSeatId()}`);
      zoeSeatAdmin.exit(completion);
    });
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
    // TODO (cth)   replace promise   (can be re-requested after upgrade)
    const offerResultPromiseKit = makePromiseKit();
    handlePKitWarning(offerResultPromiseKit);

    // TODO (cth)   replace promise   (resolved promptly after start() returns)
    const exitObjPromiseKit = makePromiseKit();
    handlePKitWarning(exitObjPromiseKit);

    state.zoeSeatID += 1;

    const { userSeat, zoeSeatAdmin } = makeZoeSeatAdminKit(
      initialAllocation,
      helper,
      proposal,
      state.zoeInstanceStorageManager.withdrawPayments,
      exitObjPromiseKit.promise,
      offerResultPromiseKit.promise,
      `${state.instanceID}:${state.zoeSeatID}`,
    );

    const seatHandle = makeHandle('Seat');
    state.seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);

    const seatData = harden({
      proposal,
      initialAllocation,
      seatHandle,
      offerArgs,
    });

    console.log(`IAS adding seat for `, zoeSeatAdmin.getSeatId());

    state.zoeSeatAdmins.add(zoeSeatAdmin);
    assert(state.handleOfferObj, 'incomplete setup of zoe seat');
    E.when(
      E(state.handleOfferObj).handleOffer(invitationHandle, seatData),
      ({ offerResultPromise, exitObj }) => {
        offerResultPromiseKit.resolve(offerResultPromise);
        exitObjPromiseKit.resolve(exitObj);
      },
      err => {
        state.adminNode.terminateWithFailure(err);
        throw err;
      },
    );

    // return the userSeat before the offerHandler is called
    return userSeat;
  },
  makeNoEscrowSeatKit: (
    { state, facets: { helper } },
    initialAllocation,
    proposal,
    exitObj,
    seatHandle,
  ) => {
    const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
      initialAllocation,
      helper,
      proposal,
      state.zoeInstanceStorageManager.withdrawPayments,
      exitObj,
      {},
      'no escrow seat',
    );
    console.log(
      `IAS adding empty seat for ${state.instanceID}`,
      seatHandle,
      zoeSeatAdmin.getSeatId(),
    );
    state.zoeSeatAdmins.add(zoeSeatAdmin);
    state.seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);
    return { userSeat, notifier };
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
  // if any string in the list matches, don't process the invitation. Strings
  // that end in ':' may be prefix matches, others must match exactly.
  isBlocked: ({ state }, string) => {
    return state.offerFilterStrings.some(s => {
      return string === s || (s.slice(-1) === ':' && string.startsWith(s));
    });
  },
  getInstanceId: ({ state }) => state.instanceID,
};

const helperBehavior = {
  exitZoeSeatAdmin: ({ state }, zoeSeatAdmin) => {
    /// //////////

    console.log(`IAS  exitZSA  ${zoeSeatAdmin.getSeatId()}`);

    return state.zoeSeatAdmins.delete(zoeSeatAdmin);
  },
  hasExited: ({ state }, zoeSeatAdmin) => {
    const has = !state.zoeSeatAdmins.has(zoeSeatAdmin);
    console.log(`IAS  hasExited? ${zoeSeatAdmin.getSeatId()}  has: ${has}`);
    return has;
  },
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
  let ID = 0;
  const makeInstanceAdminMulti = vivifyKindMulti(
    zoeBaggage,
    'instanceAdmin',
    (
      instanceHandle,
      zoeInstanceStorageManager,
      adminNode,
      publicFacetPromise,
    ) => {
      ID += 1;
      console.log(`IAS #${ID}`);
      const retVal = {
        offerFilterStrings: harden([]),
        publicFacet: publicFacetPromise,
        handleOfferObj: undefined,
        zoeInstanceStorageManager,
        seatHandleToZoeSeatAdmin,
        instanceHandle,
        acceptingOffers: true,
        zoeSeatAdmins: makeScalarBigSetStore('zoeSeatAdmins', {
          durable: true,
        }),
        adminNode,
        // debuggery
        instanceID: ID,
        zoeSeatID: 0,
      };
      return retVal;
    },
    {
      instanceAdmin: instanceAdminBehavior,
      helper: helperBehavior,
    },
  );

  return (
    instanceHandle,
    zoeInstanceStorageManager,
    adminNode,
    publicFacetPromise,
  ) => {
    const instanceAdmin = makeInstanceAdminMulti(
      instanceHandle,
      zoeInstanceStorageManager,
      adminNode,
      publicFacetPromise,
    ).instanceAdmin;
    return instanceAdmin;
  };
};

harden(makeInstanceAdminMaker);
