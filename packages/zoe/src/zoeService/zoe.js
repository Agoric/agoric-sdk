// @ts-check
import makeWeakStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 */
import '@agoric/ertp/exported';
import { makeIssuerKit, MathKind } from '@agoric/ertp';

import '../../exported';
import '../internal-types';

import { makeIssuerTable } from '../issuerTable';
import { makeZoeSeatAdminKit } from './zoeSeat';
import zcfContractBundle from '../../bundles/bundle-contractFacet';
import { arrayToObj } from '../objArrayConversion';
import { cleanKeywords, cleanProposal } from '../cleanProposal';
import { makeHandle } from '../table';

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

  // Zoe state shared among functions
  const issuerTable = makeIssuerTable();
  /** @type {WeakSet<Installation>} */
  const installations = new WeakSet();

  /** @type {WeakStore<Instance,InstanceAdmin>} */
  const instanceToInstanceAdmin = makeWeakStore('instance');

  /** @type {GetAmountMath<any>} */
  const getAmountMath = brand => issuerTable.get(brand).amountMath;

  /** @type {WeakStore<Brand, ERef<Purse>>} */
  const brandToPurse = makeWeakStore('brand');

  /**
   * Create an installation by permanently storing the bundle. It will be
   * evaluated each time it is used to make a new instance of a contract.
   */
  /** @type {Install} */
  const install = async bundle => {
    /** @type {Installation} */
    const installation = { getBundle: () => bundle };
    harden(installation);
    installations.add(installation);
    return installation;
  };

  /** @type {ZoeService} */
  const zoeService = {
    getInvitationIssuer: () => invitationKit.issuer,
    install,
    getPublicFacet: instance =>
      instanceToInstanceAdmin.get(instance).getPublicFacet(),
    getBrands: instance => instanceToInstanceAdmin.get(instance).getBrands(),
    getIssuers: instance => instanceToInstanceAdmin.get(instance).getIssuers(),
    getTerms: instance => instanceToInstanceAdmin.get(instance).getTerms(),
    getInstance: invitation =>
      E(invitationKit.issuer)
        .getAmountOf(invitation)
        .then(amount => amount.value[0].instance),
    getInstallation: invitation =>
      E(invitationKit.issuer)
        .getAmountOf(invitation)
        .then(amount => amount.value[0].installation),
    getInvitationDetails: invitation =>
      E(invitationKit.issuer)
        .getAmountOf(invitation)
        .then(amount => amount.value[0]),
    startInstance: async (
      installation,
      uncleanIssuerKeywordRecord = harden({}),
      customTerms = harden({}),
    ) => {
      /** @param {Issuer[]} issuers */
      const getPromiseForIssuerRecords = issuers =>
        Promise.all(issuers.map(issuerTable.getPromiseForIssuerRecord));
      assert(
        installations.has(installation),
        details`${installation} was not a valid installation`,
      );

      const zoeSeatAdmins = new Set();
      const instance = makeHandle('InstanceHandle');

      const keywords = cleanKeywords(uncleanIssuerKeywordRecord);

      const issuerPs = keywords.map(
        keyword => uncleanIssuerKeywordRecord[keyword],
      );

      // The issuers may not have been seen before, so we must wait for the
      // issuer records to be available synchronously
      const issuerRecords = await getPromiseForIssuerRecords(issuerPs);
      issuerRecords.forEach(record => {
        if (!brandToPurse.has(record.brand)) {
          brandToPurse.init(record.brand, E(record.issuer).makeEmptyPurse());
        }
      });

      const issuers = arrayToObj(
        issuerRecords.map(record => record.issuer),
        keywords,
      );
      const brands = arrayToObj(
        issuerRecords.map(record => record.brand),
        keywords,
      );
      const maths = arrayToObj(
        issuerRecords.map(record => record.amountMath),
        keywords,
      );

      let instanceRecord = {
        installation,
        terms: {
          ...customTerms,
          issuers,
          brands,
          maths,
        },
      };

      const createVatResultP = zcfBundleName
        ? E(vatAdminSvc).createVatByName(zcfBundleName)
        : E(vatAdminSvc).createVat(zcfContractBundle);
      const { adminNode, root } = await createVatResultP;
      /** @type {ZCFRoot} */
      const zcfRoot = root;

      const exitAllSeats = () =>
        zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.exit());

      E(adminNode)
        .done()
        .then(
          () => exitAllSeats(),
          () => exitAllSeats(),
        );

      const registerIssuerByKeyword = (keyword, issuerRecord) => {
        instanceRecord = {
          ...instanceRecord,
          terms: {
            ...instanceRecord.terms,
            issuers: {
              ...instanceRecord.terms.issuers,
              [keyword]: issuerRecord.issuer,
            },
            brands: {
              ...instanceRecord.terms.brands,
              [keyword]: issuerRecord.brand,
            },
            maths: {
              ...instanceRecord.terms.maths,
              [keyword]: issuerRecord.amountMath,
            },
          },
        };
      };

      /** @type MakeZoeMint */
      const makeZoeMint = (keyword, amountMathKind = MathKind.NAT) => {
        // Local indicates one that zoe itself makes from vetted code,
        // and so can be assumed correct and fresh by zoe.
        const {
          mint: localMint,
          issuer: localIssuer,
          amountMath: localAmountMath,
          brand: localBrand,
        } = makeIssuerKit(keyword, amountMathKind);
        const localIssuerRecord = harden({
          brand: localBrand,
          issuer: localIssuer,
          amountMath: localAmountMath,
        });
        issuerTable.initIssuerRecord(localIssuerRecord);
        registerIssuerByKeyword(keyword, localIssuerRecord);
        const localPooledPurse = localIssuer.makeEmptyPurse();
        brandToPurse.init(localBrand, localPooledPurse);

        /** @type ZoeMint */
        const zoeMint = harden({
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

      const bundle = installation.getBundle();
      const addSeatObjPromiseKit = makePromiseKit();
      const publicFacetPromiseKit = makePromiseKit();

      /** @type {InstanceAdmin} */
      const instanceAdmin = {
        addZoeSeatAdmin: async (invitationHandle, zoeSeatAdmin, seatData) => {
          zoeSeatAdmins.add(zoeSeatAdmin);
          return E(
            /** @type Promise<addSeatObj> */ (addSeatObjPromiseKit.promise),
          ).addSeat(invitationHandle, zoeSeatAdmin, seatData);
        },
        hasZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.has(zoeSeatAdmin),
        removeZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.delete(zoeSeatAdmin),
        getPublicFacet: () => publicFacetPromiseKit.promise,
        getTerms: () => instanceRecord.terms,
        getIssuers: () => instanceRecord.terms.issuers,
        getBrands: () => instanceRecord.terms.brands,
        getInstance: () => instance,
      };

      instanceToInstanceAdmin.init(instance, instanceAdmin);

      // Unpack the invitationKit.

      const {
        issuer: invitationIssuer,
        mint: invitationMint,
        amountMath: invitationAmountMath,
      } = invitationKit;

      /** @type {ZoeInstanceAdmin} */
      const zoeInstanceAdminForZcf = {
        makeInvitation: (invitationHandle, description, customProperties) => {
          const invitationAmount = invitationAmountMath.make(
            harden([
              {
                ...customProperties,
                description,
                handle: invitationHandle,
                instance,
                installation,
              },
            ]),
          );
          return invitationMint.mintPayment(invitationAmount);
        },
        // checks of keyword done on zcf side
        saveIssuer: (issuerP, keyword) =>
          (issuerTable.getPromiseForIssuerRecord(issuerP).then(issuerRecord => {
            registerIssuerByKeyword(keyword, issuerRecord);
            const { issuer, brand } = issuerRecord;
            if (!brandToPurse.has(brand)) {
              brandToPurse.init(brand, E(issuer).makeEmptyPurse());
            }
            return undefined;
          })),
        // A Seat requested by the contract without an offer
        makeOfferlessSeat: (initialAllocation, proposal) => {
          const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
            initialAllocation,
            instanceAdmin,
            cleanProposal(getAmountMath, proposal),
            brandToPurse,
          );
          zoeSeatAdmins.add(zoeSeatAdmin);
          return { userSeat, notifier, zoeSeatAdmin };
        },
        shutdown: () => {
          exitAllSeats();
          adminNode.terminate();
        },
        makeZoeMint,
      };

      // At this point, the contract will start executing. All must be ready

      const {
        creatorFacet = {},
        publicFacet = {},
        creatorInvitation: creatorInvitationP,
        addSeatObj,
      } = await E(zcfRoot).executeContract(
        bundle,
        zoeService,
        invitationIssuer,
        zoeInstanceAdminForZcf,
        harden({ ...instanceRecord }),
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
            details`The contract did not correctly return a creatorInvitation`,
          );
        }
        // Actually returned to the user.
        return {
          creatorFacet,
          creatorInvitation,
          instance,
          publicFacet,
        };
      });
    },
    offer: async (
      invitation,
      uncleanProposal = harden({}),
      paymentKeywordRecord = harden({}),
    ) => {
      return invitationKit.issuer.burn(invitation).then(invitationAmount => {
        assert(
          invitationAmount.value.length === 1,
          'Only one invitation can be redeemed at a time',
        );

        const proposal = cleanProposal(getAmountMath, uncleanProposal);
        const { give, want } = proposal;
        const giveKeywords = Object.keys(give);
        const wantKeywords = Object.keys(want);
        const proposalKeywords = harden([...giveKeywords, ...wantKeywords]);

        const paymentDepositedPs = proposalKeywords.map(keyword => {
          if (giveKeywords.includes(keyword)) {
            // We cannot trust the amount in the proposal, so we use our
            // cleaned proposal's amount that should be the same.
            const giveAmount = proposal.give[keyword];
            const purse = brandToPurse.get(giveAmount.brand);
            return E(purse).deposit(paymentKeywordRecord[keyword], giveAmount);
            // eslint-disable-next-line no-else-return
          } else {
            // payments outside the give: clause are ignored.
            return getAmountMath(proposal.want[keyword].brand).getEmpty();
          }
        });
        const {
          value: [{ instance, handle: invitationHandle }],
        } = invitationAmount;

        return Promise.all(paymentDepositedPs).then(amountsArray => {
          const initialAllocation = arrayToObj(amountsArray, proposalKeywords);

          const offerResultPromiseKit = makePromiseKit();
          const exitObjPromiseKit = makePromiseKit();
          const instanceAdmin = instanceToInstanceAdmin.get(instance);

          const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
            initialAllocation,
            instanceAdmin,
            proposal,
            brandToPurse,
            {
              offerResult: offerResultPromiseKit.promise,
              exitObj: exitObjPromiseKit.promise,
            },
          );

          const seatData = harden({ proposal, initialAllocation, notifier });

          instanceAdmin
            .addZoeSeatAdmin(invitationHandle, zoeSeatAdmin, seatData)
            .then(({ offerResultP, exitObj }) => {
              offerResultPromiseKit.resolve(offerResultP);
              exitObjPromiseKit.resolve(exitObj);
            });

          return userSeat;
        });
      });
    },
  };
  harden(zoeService);

  return zoeService;
}

export { makeZoe };
