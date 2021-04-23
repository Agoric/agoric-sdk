// @ts-check
import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 *
 * Within Zoe, the mathKind of validated amounts must be consistent
 * with the brand's mathKind. This is stricter than the validation
 * provided by amountMath currently. When the brand has a
 * mathKind itself, amountMath will validate that.
 */
import '@agoric/ertp/exported';
import '@agoric/store/exported';
import { makeIssuerKit, MathKind, amountMath } from '@agoric/ertp';

import '../../exported';
import '../internal-types';

import { Far } from '@agoric/marshal';
import { makeZoeSeatAdminKit } from './zoeSeat';
import zcfContractBundle from '../../bundles/bundle-contractFacet';
import { cleanProposal } from '../cleanProposal';
import { makeHandle } from '../makeHandle';
import { makeInstallationStorage } from './installationStorage';
import { makeEscrowStorage } from './escrowStorage';
import { makeIssuerStorage } from '../issuerStorage';
import { makeAndStoreInstanceRecord } from '../instanceRecordStorage';
import { makeIssuerRecord } from '../issuerRecord';

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {string} [zcfBundleName] - The name of the contract facet bundle.
 * @returns {ZoeService} The created Zoe service.
 */
function makeZoe(vatAdminSvc, zcfBundleName = undefined) {
  const invitationKit = makeIssuerKit('Zoe Invitation', MathKind.SET);

  /** @type {WeakStore<Instance,InstanceAdmin>} */
  const instanceToInstanceAdmin = makeNonVOWeakStore('instance');

  /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
  const seatHandleToZoeSeatAdmin = makeNonVOWeakStore('seatHandle');

  const {
    createPurse,
    makeLocalPurse,
    withdrawPayments,
    depositPayments,
  } = makeEscrowStorage();

  const {
    storeIssuerKeywordRecord,
    storeIssuer,
    storeIssuerRecord,
    getMathKind,
    exportIssuerStorage,
  } = makeIssuerStorage();

  const { install, unwrapInstallation } = makeInstallationStorage();

  /** @type {GetAmountOfInvitationThen} */
  const getAmountOfInvitationThen = async (invitationP, onFulfilled) => {
    const onRejected = () =>
      assert.fail(X`A Zoe invitation is required, not ${invitationP}`);
    return E(invitationKit.issuer)
      .getAmountOf(invitationP)
      .then(onFulfilled, onRejected);
  };

  /** @type {ZoeService} */
  const zoeService = Far('zoeService', {
    getInvitationIssuer: () => invitationKit.issuer,
    install,
    getPublicFacet: instance =>
      instanceToInstanceAdmin.get(instance).getPublicFacet(),
    getBrands: instance => instanceToInstanceAdmin.get(instance).getBrands(),
    getIssuers: instance => instanceToInstanceAdmin.get(instance).getIssuers(),
    getTerms: instance => instanceToInstanceAdmin.get(instance).getTerms(),
    getInstance: invitation => {
      const onFulfilled = amount => amount.value[0].instance;
      return getAmountOfInvitationThen(invitation, onFulfilled);
    },
    getInstallation: invitation => {
      const onFulfilled = amount => amount.value[0].installation;
      return getAmountOfInvitationThen(invitation, onFulfilled);
    },
    getInvitationDetails: invitation => {
      const onFulfilled = amount => amount.value[0];
      return getAmountOfInvitationThen(invitation, onFulfilled);
    },
    startInstance: async (
      installationP,
      uncleanIssuerKeywordRecord = harden({}),
      customTerms = harden({}),
    ) => {
      const { installation, bundle } = await unwrapInstallation(installationP);
      // AWAIT ///

      const instance = makeHandle('Instance');

      const { issuers, brands } = await storeIssuerKeywordRecord(
        uncleanIssuerKeywordRecord,
      );
      // AWAIT ///

      Object.entries(issuers).forEach(([keyword, issuer]) =>
        createPurse(issuer, brands[keyword]),
      );

      const {
        addIssuerToInstanceRecord,
        getInstanceRecord,
        getTerms,
        getIssuers,
        getBrands,
      } = makeAndStoreInstanceRecord(
        installation,
        customTerms,
        issuers,
        brands,
      );

      const createVatResultP = zcfBundleName
        ? E(vatAdminSvc).createVatByName(zcfBundleName)
        : E(vatAdminSvc).createVat(zcfContractBundle);
      const { adminNode, root } = await createVatResultP;
      /** @type {ZCFRoot} */
      const zcfRoot = root;

      /** @type {MakeZoeMint} */
      const makeZoeMint = (
        keyword,
        amountMathKind = MathKind.NAT,
        displayInfo,
      ) => {
        // Local indicates one that zoe itself makes from vetted code,
        // and so can be assumed correct and fresh by zoe.
        const {
          mint: localMint,
          issuer: localIssuer,
          brand: localBrand,
        } = makeIssuerKit(keyword, amountMathKind, displayInfo);
        const localIssuerRecord = makeIssuerRecord(
          localBrand,
          localIssuer,
          amountMathKind,
          displayInfo,
        );
        storeIssuerRecord(localIssuerRecord);
        const localPooledPurse = makeLocalPurse(localIssuer, localBrand);
        addIssuerToInstanceRecord(keyword, localIssuerRecord);
        /** @type {ZoeMint} */
        const zoeMint = Far('ZoeMint', {
          getIssuerRecord: () => {
            return localIssuerRecord;
          },
          mintAndEscrow: totalToMint => {
            const payment = localMint.mintPayment(totalToMint);
            localPooledPurse.deposit(payment, totalToMint);
          },
          withdrawAndBurn: totalToBurn => {
            const payment = localPooledPurse.withdraw(totalToBurn);
            localIssuer.burn(payment, totalToBurn);
          },
        });
        return zoeMint;
      };

      const addSeatObjPromiseKit = makePromiseKit();
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
      // This does not suppress any error messages.
      addSeatObjPromiseKit.promise.catch(_ => {});
      const publicFacetPromiseKit = makePromiseKit();
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
      // This does not suppress any error messages.
      publicFacetPromiseKit.promise.catch(_ => {});

      const makeInstanceAdmin = () => {
        /** @type {Set<ZoeSeatAdmin>} */
        const zoeSeatAdmins = new Set();
        let acceptingOffers = true;

        /** @type {InstanceAdmin} */
        return Far('instanceAdmin', {
          addZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.add(zoeSeatAdmin),
          tellZCFToMakeSeat: (
            invitationHandle,
            zoeSeatAdmin,
            seatData,
            seatHandle,
          ) => {
            return E(
              /** @type {Promise<AddSeatObj>} */ (addSeatObjPromiseKit.promise),
            ).addSeat(invitationHandle, zoeSeatAdmin, seatData, seatHandle);
          },
          hasZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.has(zoeSeatAdmin),
          removeZoeSeatAdmin: zoeSeatAdmin =>
            zoeSeatAdmins.delete(zoeSeatAdmin),
          getPublicFacet: () => publicFacetPromiseKit.promise,
          getTerms,
          getIssuers,
          getBrands,
          getInstance: () => instance,
          acceptingOffers: () => acceptingOffers,
          exitAllSeats: completion => {
            acceptingOffers = false;
            zoeSeatAdmins.forEach(zoeSeatAdmin =>
              zoeSeatAdmin.exit(completion),
            );
          },
          failAllSeats: reason => {
            acceptingOffers = false;
            zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.fail(reason));
          },
          stopAcceptingOffers: () => (acceptingOffers = false),
        });
      };

      const instanceAdmin = makeInstanceAdmin();
      instanceToInstanceAdmin.init(instance, instanceAdmin);

      E(adminNode)
        .done()
        .then(
          completion => instanceAdmin.exitAllSeats(completion),
          reason => instanceAdmin.failAllSeats(reason),
        );

      // Unpack the invitationKit.
      const {
        issuer: invitationIssuer,
        mint: invitationMint,
        brand: invitationBrand,
      } = invitationKit;

      /** @type {ZoeInstanceAdmin} */
      const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
        makeInvitation: (invitationHandle, description, customProperties) => {
          const invitationAmount = amountMath.make(
            [
              {
                ...customProperties,
                description,
                handle: invitationHandle,
                instance,
                installation,
              },
            ],
            invitationBrand,
          );
          return invitationMint.mintPayment(invitationAmount);
        },
        // checks of keyword done on zcf side
        saveIssuer: async (issuerP, keyword) => {
          const issuerRecord = await storeIssuer(issuerP);
          // AWAIT ///
          createPurse(issuerRecord.issuer, issuerRecord.brand);
          addIssuerToInstanceRecord(keyword, issuerRecord);
          return issuerRecord;
        },
        // A Seat requested by the contract without any payments to escrow
        makeNoEscrowSeat: (
          initialAllocation,
          proposal,
          exitObj,
          seatHandle,
        ) => {
          const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
            initialAllocation,
            instanceAdmin,
            proposal,
            withdrawPayments,
            exitObj,
          );
          instanceAdmin.addZoeSeatAdmin(zoeSeatAdmin);
          seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);
          return { userSeat, notifier, zoeSeatAdmin };
        },
        exitAllSeats: completion => instanceAdmin.exitAllSeats(completion),
        failAllSeats: reason => instanceAdmin.failAllSeats(reason),
        makeZoeMint,
        replaceAllocations: seatHandleAllocations => {
          seatHandleAllocations.forEach(({ seatHandle, allocation }) => {
            const zoeSeatAdmin = seatHandleToZoeSeatAdmin.get(seatHandle);
            zoeSeatAdmin.replaceAllocation(allocation);
          });
        },
        stopAcceptingOffers: () => instanceAdmin.stopAcceptingOffers(),
      });

      // At this point, the contract will start executing. All must be
      // ready

      const instanceRecord = getInstanceRecord();

      const {
        creatorFacet = Far('emptyCreatorFacet', {}),
        publicFacet = Far('emptyPublicFacet', {}),
        creatorInvitation: creatorInvitationP,
        addSeatObj,
      } = await E(zcfRoot).executeContract(
        bundle,
        zoeService,
        invitationIssuer,
        zoeInstanceAdminForZcf,
        instanceRecord,
        exportIssuerStorage(Object.values(instanceRecord.terms.issuers)),
      );

      addSeatObjPromiseKit.resolve(addSeatObj);
      publicFacetPromiseKit.resolve(publicFacet);

      // creatorInvitation can be undefined, but if it is defined,
      // let's make sure it is an invitation.
      return Promise.allSettled([
        creatorInvitationP,
        invitationIssuer.isLive(creatorInvitationP),
      ]).then(([invitationResult, isLiveResult]) => {
        let creatorInvitation;
        if (invitationResult.status === 'fulfilled') {
          creatorInvitation = invitationResult.value;
        }
        if (creatorInvitation !== undefined) {
          assert(
            isLiveResult.status === 'fulfilled' && isLiveResult.value,
            X`The contract did not correctly return a creatorInvitation`,
          );
        }
        const adminFacet = Far('adminFacet', {
          getVatShutdownPromise: () => E(adminNode).done(),
          getVatStats: () => E(adminNode).adminData(),
        });

        // Actually returned to the user.
        return {
          creatorFacet,
          creatorInvitation,
          instance,
          publicFacet,
          adminFacet,
        };
      });
    },
    offer: async (
      invitation,
      uncleanProposal = harden({}),
      paymentKeywordRecord = harden({}),
    ) => {
      return invitationKit.issuer.burn(invitation).then(
        async invitationAmount => {
          const invitationValue = invitationAmount.value;
          assert(Array.isArray(invitationValue));
          assert(
            invitationValue.length === 1,
            'Only one invitation can be redeemed at a time',
          );
          const [{ instance, handle: invitationHandle }] = invitationValue;
          const instanceAdmin = instanceToInstanceAdmin.get(instance);
          assert(
            instanceAdmin.acceptingOffers(),
            `No further offers are accepted`,
          );

          const proposal = cleanProposal(uncleanProposal, getMathKind);
          const initialAllocation = await depositPayments(
            proposal,
            paymentKeywordRecord,
          );
          // AWAIT ///

          const offerResultPromiseKit = makePromiseKit();
          // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
          // This does not suppress any error messages.
          offerResultPromiseKit.promise.catch(_ => {});
          const exitObjPromiseKit = makePromiseKit();
          // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
          // This does not suppress any error messages.
          exitObjPromiseKit.promise.catch(_ => {});
          const seatHandle = makeHandle('SeatHandle');

          const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
            initialAllocation,
            instanceAdmin,
            proposal,
            withdrawPayments,
            exitObjPromiseKit.promise,
            offerResultPromiseKit.promise,
          );

          seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);

          const seatData = harden({ proposal, initialAllocation, notifier });

          instanceAdmin.addZoeSeatAdmin(zoeSeatAdmin);
          instanceAdmin
            .tellZCFToMakeSeat(
              invitationHandle,
              zoeSeatAdmin,
              seatData,
              seatHandle,
            )
            .then(({ offerResultP, exitObj }) => {
              offerResultPromiseKit.resolve(offerResultP);
              exitObjPromiseKit.resolve(exitObj);
            })
            // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
            // This does not suppress any error messages.
            .catch(() => {});

          return userSeat;
        },
        () => {
          assert.fail(X`A Zoe invitation is required, not ${invitation}`);
        },
      );
    },
  });

  return zoeService;
}

export { makeZoe };
