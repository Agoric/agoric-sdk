// @ts-check
import makeIssuerKit from '@agoric/ertp';
import makeWeakStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 */
import '@agoric/ertp/exported';

import '../../exported';
import '../internal-types';

import { makeIssuerTable } from '../issuerTable';
import zcfContractBundle from '../../bundles/bundle-contractFacet';
import { arrayToObj } from '../objArrayConversion';
import { cleanKeywords, cleanProposal } from './cleanProposal';

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @returns {ZoeService} The created Zoe service.
 */
function makeZoe(vatAdminSvc) {
  const invitationKit = makeIssuerKit('Zoe Invitation', 'set');

  // Zoe state shared among functions
  const issuerTable = makeIssuerTable();
  /** @type {Set<Installation>} */
  const installations = new Set();

  /** @type {WeakStore<Instance,InstanceAdmin>} */
  const instanceToInstanceAdmin = makeWeakStore('instance');

  /** @type {GetAmountMath<any>} */
  const getAmountMath = brand => issuerTable.get(brand).amountMath;

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
    makeInstance: async (
      installation,
      uncleanIssuerKeywordRecord = harden({}),
      terms = harden({}),
    ) => {
      // Unpack the invitationKit.

      const {
        issuer: invitationIssuer,
        mint: invitationMint,
        amountMath: invitationAmountMath,
      } = invitationKit;

      const getPromiseForIssuerRecords = issuers =>
        Promise.all(issuers.map(issuerTable.getPromiseForIssuerRecord));
      assert(
        installations.has(installation),
        details`${installation} was not a valid installation`,
      );

      const zoeSeatAdmins = new Set();
      const instance = harden({});

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

      const instanceRecord = {
        issuerKeywordRecord: arrayToObj(
          issuerRecords.map(record => record.issuer),
          keywords,
        ),
        brandKeywordRecord: arrayToObj(
          issuerRecords.map(record => record.brand),
          keywords,
        ),
        installation,
        terms,
      };

      const createVatResult = await E(vatAdminSvc).createVat(zcfContractBundle);
      const { adminNode, root } = createVatResult;
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
          issuerTable
            .getPromiseForIssuerRecord(issuerP)
            .then(({ issuer, brand }) => {
              instanceRecord.issuerKeywordRecord = {
                ...instanceRecord.issuerKeywordRecord,
                [keyword]: issuer,
              };
              instanceRecord.brandKeywordRecord = {
                ...instanceRecord.brandKeywordRecord,
                [keyword]: brand,
              };
              if (!brandToPurse.has(brand)) {
                brandToPurse.init(brand, E(issuer).makeEmptyPurse());
              }
            }),
        shutdown: () => {
          exitAllSeats();
          adminNode.terminate();
        },
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
        removeZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.delete(zoeSeatAdmin),
        getPublicFacet: () => publicFacetPromiseKit.promise,
        getTerms: () => instanceRecord.terms,
        getIssuers: () => instanceRecord.issuerKeywordRecord,
        getBrands: () => instanceRecord.brandKeywordRecord,
        getInstance: () => instance,
      };

      instanceToInstanceAdmin.init(instance, instanceAdmin);

      const {
        creatorFacet = {},
        publicFacet = {},
        creatorInvitation,
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

      const creatorFacetWInstance = {
        ...creatorFacet,
        getInstance: () => instance,
      };

      // Actually returned to the user.
      return {
        creatorFacet: creatorFacetWInstance,
        creatorInvitation: await creatorInvitation,
      };
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

          const payoutPromiseKit = makePromiseKit();
          const offerResultPromiseKit = makePromiseKit();
          const exitObjPromiseKit = makePromiseKit();
          const { notifier, updater } = makeNotifierKit();
          let currentAllocation = initialAllocation;

          const instanceAdmin = instanceToInstanceAdmin.get(instance);

          /** @type {ZoeSeatAdmin} */
          const zoeSeatAdmin = {
            replaceAllocation: replacementAllocation => {
              harden(replacementAllocation);
              // Merging happens in ZCF, so replacementAllocation can
              // replace the old allocation entirely.
              updater.updateState(replacementAllocation);
              currentAllocation = replacementAllocation;
            },
            exit: () => {
              updater.finish(undefined);
              instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);

              /** @type {PaymentPKeywordRecord} */
              const payout = {};
              Object.entries(currentAllocation).forEach(
                ([keyword, payoutAmount]) => {
                  const purse = brandToPurse.get(payoutAmount.brand);
                  payout[keyword] = E(purse).withdraw(payoutAmount);
                },
              );
              harden(payout);
              payoutPromiseKit.resolve(payout);
            },
          };
          harden(zoeSeatAdmin);

          /** @type {UserSeat} */
          const userSeat = {
            getCurrentAllocation: async () => currentAllocation,
            getProposal: async () => proposal,
            getPayouts: async () => payoutPromiseKit.promise,
            getPayout: async keyword =>
              payoutPromiseKit.promise.then(payouts => payouts[keyword]),
            getOfferResult: async () => offerResultPromiseKit.promise,
            exit: async () =>
              exitObjPromiseKit.promise.then(exitObj => E(exitObj).exit()),
          };

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
