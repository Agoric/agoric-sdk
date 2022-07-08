// @ts-check

import { E } from '@endo/eventual-send';
import { Far, Remotable, passStyleOf } from '@endo/marshal';
import { AssetKind } from '@agoric/ertp';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@endo/promise-kit';
import { assertPattern } from '@agoric/store';
import {
  makeScalarBigMapStore,
  provideDurableMapStore,
  provideKindHandle,
  defineDurableKind,
} from '@agoric/vat-data';

import { cleanProposal } from '../cleanProposal.js';
import { evalContractBundle } from './evalContractCode.js';
import { makeExitObj } from './exit.js';
import { defineDurableHandle } from '../makeHandle.js';
import { makeIssuerStorage } from '../issuerStorage.js';
import { createSeatManager } from './zcfSeat.js';
import { makeInstanceRecordStorage } from '../instanceRecordStorage.js';
import { handlePWarning, handlePKitWarning } from '../handleWarning.js';
import { makeOfferHandlerStorage } from './offerHandlerStorage.js';
import { makeZCFMintFactory } from './zcfMint.js';

import '../../exported.js';
import '../internal-types.js';
import './internal-types.js';

import '@agoric/swingset-vat/src/types-ambient.js';

const { details: X, makeAssert } = assert;

/**
 * Make the ZCF vat in zygote-usable form. First, a generic ZCF is
 * made, then the contract code is evaluated, then a particular
 * instance is made.
 *
 * @param {VatPowers} powers
 * @param {ERef<ZoeService>} zoeService
 * @param {Issuer} invitationIssuer
 * @param {TestJigSetter} testJigSetter
 * @param {BundleCap} contractBundleCap
 * @param {import('@agoric/vat-data').Baggage} zcfBaggage
 * @returns {Promise<ZCFZygote>}
 */
export const makeZCFZygote = async (
  powers,
  zoeService,
  invitationIssuer,
  testJigSetter,
  contractBundleCap,
  zcfBaggage = makeScalarBigMapStore('zcfBaggage', { durable: true }),
) => {
  const makeSeatHandle = defineDurableHandle(zcfBaggage, 'Seat');
  /** @type {PromiseRecord<ZoeInstanceAdmin>} */
  const zoeInstanceAdminPromiseKit = makePromiseKit();
  const zoeInstanceAdmin = zoeInstanceAdminPromiseKit.promise;

  const {
    storeIssuerRecord,
    getAssetKindByBrand,
    getBrandForIssuer,
    getIssuerForBrand,
    instantiate: instantiateIssuerStorage,
  } = makeIssuerStorage(zcfBaggage);

  /** @type {ShutdownWithFailure} */
  const shutdownWithFailure = reason => {
    E(zoeInstanceAdmin).failAllSeats(reason);
    // eslint-disable-next-line no-use-before-define
    dropAllReferences();
    // https://github.com/Agoric/agoric-sdk/issues/3239
    powers.exitVatWithFailure(reason);
  };

  const { makeZCFSeat, reallocate, reallocateForZCFMint, dropAllReferences } =
    createSeatManager(
      zoeInstanceAdmin,
      getAssetKindByBrand,
      shutdownWithFailure,
      zcfBaggage,
    );

  const { storeOfferHandler, takeOfferHandler } =
    makeOfferHandlerStorage(zcfBaggage);

  // Make the instanceRecord
  const {
    addIssuerToInstanceRecord,
    getTerms,
    assertUniqueKeyword,
    getInstanceRecord,
    instantiate: instantiateInstanceRecordStorage,
  } = makeInstanceRecordStorage();

  const recordIssuer = (keyword, issuerRecord) => {
    addIssuerToInstanceRecord(keyword, issuerRecord);
    storeIssuerRecord(issuerRecord);
  };

  const makeEmptySeatKit = (exit = undefined) => {
    const initialAllocation = harden({});
    const proposal = cleanProposal(harden({ exit }), getAssetKindByBrand);
    const { notifier, updater } = makeNotifierKit();
    const userSeatPromiseKit = makePromiseKit();
    handlePKitWarning(userSeatPromiseKit);
    const seatHandle = makeSeatHandle();

    const seatData = harden({
      proposal,
      initialAllocation,
      notifier,
      seatHandle,
    });
    const zcfSeat = makeZCFSeat(seatData);

    const exitObj = makeExitObj(seatData.proposal, zcfSeat);

    E(zoeInstanceAdmin)
      .makeNoEscrowSeat(initialAllocation, proposal, exitObj, seatHandle)
      .then(({ notifier: zoeNotifier, userSeat }) => {
        observeNotifier(zoeNotifier, updater);
        userSeatPromiseKit.resolve(userSeat);
      });

    return { zcfSeat, userSeat: userSeatPromiseKit.promise };
  };

  const zcfMintFactory = await makeZCFMintFactory(
    zcfBaggage,
    recordIssuer,
    getAssetKindByBrand,
    makeEmptySeatKit,
    reallocateForZCFMint,
  );

  /**
   * @template {AssetKind} [K='nat']
   * @param {Keyword} keyword
   * @param {K} [assetKind]
   * @param {AdditionalDisplayInfo=} displayInfo
   * @returns {Promise<ZCFMint<K>>}
   */
  const makeZCFMint = async (
    keyword,
    // @ts-expect-error possible different subtype
    assetKind = AssetKind.NAT,
    displayInfo,
  ) => {
    assertUniqueKeyword(keyword);

    // TODO is this AWAIT ok? Or does this need atomicity?
    // We probably need the same keyword reservation logic that
    // was added to addPool
    const zoeMint = await E(zoeInstanceAdmin).makeZoeMint(
      keyword,
      assetKind,
      displayInfo,
    );
    // @ts-expect-error type issues?
    return zcfMintFactory.makeZCFMintInternal(keyword, zoeMint);
  };

  /** @type {ZCFRegisterFeeMint} */
  const registerFeeMint = async (keyword, feeMintAccess) => {
    assertUniqueKeyword(keyword);

    // TODO is this AWAIT ok? Or does this need atomicity?
    const zoeMint = await E(zoeInstanceAdmin).registerFeeMint(
      keyword,
      feeMintAccess,
    );
    // @ts-expect-error type issues?
    return zcfMintFactory.makeZCFMintInternal(keyword, zoeMint);
  };

  /** @type {ZCF} */
  const zcf = Remotable('Alleged: zcf', undefined, {
    // Using Remotable rather than Far because too many complications
    // imposing checking wrappers: makeInvitation and setJig want to
    // accept raw functions. assert cannot be a valid passable!
    reallocate,
    assertUniqueKeyword,
    saveIssuer: async (issuerP, keyword) => {
      // TODO: The checks of the keyword for uniqueness are
      // duplicated. Assess how waiting on promises to resolve might
      // affect those checks and see if one can be removed.
      assertUniqueKeyword(keyword);
      const record = await E(zoeInstanceAdmin).saveIssuer(issuerP, keyword);
      // AWAIT ///
      recordIssuer(keyword, record);
      return record;
    },
    makeInvitation: (
      offerHandler = Far('default offer handler', () => {}),
      description,
      customProperties = harden({}),
      proposalSchema = undefined,
    ) => {
      assert.typeof(
        description,
        'string',
        X`invitations must have a description string: ${description}`,
      );
      if (proposalSchema !== undefined) {
        assertPattern(proposalSchema);
      }

      const invitationHandle = storeOfferHandler(offerHandler);
      /** @type {Promise<Payment>} */
      const invitationP = E(zoeInstanceAdmin).makeInvitation(
        invitationHandle,
        description,
        customProperties,
        proposalSchema,
      );
      return invitationP;
    },
    // Shutdown the entire vat and give payouts
    shutdown: completion => {
      E(zoeInstanceAdmin).exitAllSeats(completion);
      dropAllReferences();
      powers.exitVat(completion);
    },
    shutdownWithFailure,
    assert: makeAssert(shutdownWithFailure),
    stopAcceptingOffers: () => E(zoeInstanceAdmin).stopAcceptingOffers(),
    makeZCFMint,
    registerFeeMint,
    makeEmptySeatKit,

    // The methods below are pure and have no side-effects //
    getZoeService: () => zoeService,
    getInvitationIssuer: () => invitationIssuer,
    getTerms,
    getBrandForIssuer,
    getIssuerForBrand,
    getAssetKind: getAssetKindByBrand,
    /** @type {SetTestJig} */
    setTestJig: (testFn = () => ({})) => {
      if (testJigSetter) {
        testJigSetter({ ...testFn(), zcf });
      }
    },
    getInstance: () => getInstanceRecord().instance,
  });

  const handleOfferHandle = provideKindHandle(zcfBaggage, 'handleOfferObj');
  // handleOfferObject gives Zoe the ability to notify ZCF when a new seat is
  // added in offer(). ZCF responds with the exitObj and offerResult.
  const makeHandleOfferObj = defineDurableKind(handleOfferHandle, () => ({}), {
    handleOffer: (_context, invitationHandle, seatData) => {
      const zcfSeat = makeZCFSeat(seatData);
      // TODO: provide a details that's a better diagnostic for the
      // ephemeral offerHandler that did not survive upgrade.
      const offerHandler = takeOfferHandler(invitationHandle);
      const offerResultP =
        typeof offerHandler === 'function'
          ? E(offerHandler)(zcfSeat, seatData.offerArgs)
          : // @ts-expect-error Type issues?
            E(offerHandler).handle(zcfSeat, seatData.offerArgs);

      const offerResultPromise = offerResultP.catch(reason => {
        if (reason === undefined) {
          const newErr = new Error(
            `If an offerHandler throws, it must provide a reason of type Error, but the reason was undefined. Please fix the contract code to specify a reason for throwing.`,
          );
          throw zcfSeat.fail(newErr);
        }
        throw zcfSeat.fail(reason);
      });
      const exitObj = makeExitObj(seatData.proposal, zcfSeat);
      /** @type {HandleOfferResult} */
      return harden({ offerResultPromise, exitObj });
    },
  });
  const handleOfferObj = makeHandleOfferObj();

  const evaluateContract = () => {
    let bundle;
    if (passStyleOf(contractBundleCap) === 'remotable') {
      const bundleCap = contractBundleCap;
      // @ts-expect-error vatPowers is not typed correctly: https://github.com/Agoric/agoric-sdk/issues/3239
      bundle = powers.D(bundleCap).getBundle();
    } else {
      bundle = contractBundleCap;
    }
    return evalContractBundle(bundle);
  };
  // evaluate the contract (either the first version, or an upgrade). start is
  // from a non-upgradeable contract, setupInstallation for upgradeable ones.
  const { setupInstallation, start, buildRootObject } =
    await evaluateContract();

  if (start === undefined && setupInstallation === undefined) {
    assert(
      buildRootObject === undefined,
      X`Did you provide a vat bundle instead of a contract bundle?`,
    );
    assert.fail(X`unrecognized contract exports`);
  }

  const contractBaggage = provideDurableMapStore(zcfBaggage, 'contractBaggage');

  // start a non-upgradeable contract
  const startClassicContract = privateArgs => {
    /** @type {Promise<ExecuteClassicContractResult>} */
    const result = E.when(
      start(zcf, privateArgs),
      ({
        creatorFacet = undefined,
        publicFacet = undefined,
        creatorInvitation = undefined,
      }) => {
        return harden({
          creatorFacet,
          publicFacet,
          creatorInvitation,
          handleOfferObj,
        });
      },
    );
    handlePWarning(result);
    return result;
  };

  // If the contract is upgradeable, call setupInstallation now.
  let setupInstanceP;
  if (setupInstallation) {
    // setupInstallation is a fn returned by the contract that sets up
    // installation-specific state and defines kinds, then returns
    // setupInstance. setupInstance does instance-specific setup and returns
    // makeInstanceKit.

    // notice that we're passing the zcf object here.  It's not completely
    // initialized at this point, but the contract will often want to capture it
    // in durableKinds defined before setupInstance is called.
    setupInstanceP = setupInstallation(contractBaggage, zcf);
  }

  // snapshot zygote here //////////////////
  // the zygote object below will be created now, but its methods won't be
  // invoked until after the snapshot is taken.

  const setupInstance = await setupInstanceP;

  /**
   * A zygote is a pre-image of a vat that can quickly be instantiated because
   * the code has already been evaluated. SwingSet doesn't support zygotes yet.
   * Once it does the code will be evaluated once when creating the zcfZygote,
   * then the start() function will be called each time an instance is started.
   *
   * Currently, Zoe's buildRootObject calls makeZCFZygote, evaluateContract, and
   * startContract every time a contract instance is created.
   *
   * @type {ZCFZygote}
   * */
  const zcfZygote = {
    // wire zcf up to zoe instance-specific interfaces
    startContract: async (
      instanceAdminFromZoe,
      instanceRecordFromZoe,
      issuerStorageFromZoe,
      privateArgs = undefined,
    ) => {
      zoeInstanceAdminPromiseKit.resolve(instanceAdminFromZoe);
      zcfBaggage.init('instanceAdmin', instanceAdminFromZoe);
      instantiateInstanceRecordStorage(instanceRecordFromZoe);
      instantiateIssuerStorage(issuerStorageFromZoe);

      // If it's a non-upgradeable contract, start it now.
      if (!setupInstallation) {
        return startClassicContract(privateArgs);
      }

      // now that our clone is differentiated, we can do
      // instance-specific setup and get back the contract runner
      const makeInstanceKit = await setupInstance(privateArgs);

      // and invoke makeInstanceKit() for the first and only time
      const { publicFacet, creatorFacet } = makeInstanceKit();
      /** @type {ExecuteUpgradeableContractResult} */
      const upgradeableResult = harden({
        publicFacet,
        creatorFacet,
        handleOfferObj,
      });
      return upgradeableResult;
    },
    restartContract: async (privateArgs = undefined) => {
      const instanceAdmin = zcfBaggage.get('instanceAdmin');
      zoeInstanceAdminPromiseKit.resolve(instanceAdmin);

      // For version-2 or later, we know we've already been started, so
      // allow the contract to set up its instance Kinds

      // now that our clone is differentiated, we can do
      // instance-specific setup and get back the contract runner
      // however we do not call makeInstanceKit() again
      // eslint-disable-next-line no-underscore-dangle
      const _makeInstanceKit = await setupInstance(privateArgs);

      // Nothing is returned from restartContract(). If there is new behavior or
      // new facets, they must be accessed through the existing facets.
    },
  };
  return harden(zcfZygote);
};
