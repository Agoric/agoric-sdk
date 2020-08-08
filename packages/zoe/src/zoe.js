// @ts-check

import { E } from '@agoric/eventual-send';
import makeWeakStore from '@agoric/weak-store';
import makeIssuerKit from '@agoric/ertp';
import { assert, details } from '@agoric/assert';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 */
import '../exported';
import './internal-types';

import { cleanProposal, cleanKeywords } from './cleanProposal';
import { arrayToObj, filterFillAmounts, filterObj } from './objArrayConversion';
import { makeZoeTables, makeHandle } from './state';

// This is the Zoe contract facet from contractFacet.js, packaged as a bundle
// that can be used to create a new vat. Every time it is edited, it must be
// manually rebuilt with `yarn build-zcfBundle`.  This happens automatically
// on `yarn build` or `yarn test`.

// Do the dance necessary to allow a non-existing bundle to pass both lint and ts.
/* eslint-disable import/no-unresolved, import/extensions */
// @ts-ignore
import zcfContractBundle from '../bundles/bundle-contractFacet';
/* eslint-enable import/no-unresolved, import/extensions */

/**
 * Create an instance of Zoe.
 *
 * @param {Object} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @returns {ZoeService} The created Zoe service.
 */
function makeZoe(vatAdminSvc) {
  /**
   * A weakMap from the inviteHandles to contract offerHook upcalls
   * @type {WeakStore<InviteHandle,OfferHook<any>>}
   */
  const inviteHandleToHandler = makeWeakStore('inviteHandle');

  const {
    mint: inviteMint,
    issuer: inviteIssuer,
    amountMath: inviteAmountMath,
  } = makeIssuerKit('zoeInvite', 'set');

  // All of the Zoe state is stored in these tables built on WeakMaps
  const {
    installationTable,
    instanceTable,
    offerTable,
    payoutMap,
    issuerTable,
  } = makeZoeTables();

  const getAmountMathForBrand = brand => issuerTable.get(brand).amountMath;

  /**
   * @param {InstanceHandle} instanceHandle
   * @param {OfferHandle[]} offerHandles
   */
  const completeOffers = (instanceHandle, offerHandles) => {
    const { inactive } = offerTable.getOfferStatuses(offerHandles);
    if (inactive.length > 0) {
      throw new Error(`offer has already completed`);
    }
    const offerRecords = offerTable.getOffers(offerHandles);

    // Remove the offers from the offerTable so that they are no longer active.
    offerTable.deleteOffers(offerHandles);

    // Resolve the payout promises with promises for the payouts
    for (const offerRecord of offerRecords) {
      /** @type {PaymentPKeywordRecord} */
      const payout = {};
      Object.keys(offerRecord.currentAllocation).forEach(keyword => {
        const payoutAmount = offerRecord.currentAllocation[keyword];
        const { purse } = issuerTable.get(payoutAmount.brand);
        payout[keyword] = E(purse).withdraw(payoutAmount);
      });
      harden(payout);
      payoutMap.get(offerRecord.handle).resolve(payout);
    }

    // Remove the offers from the instanceTable now that they've been completed.
    instanceTable.removeCompletedOffers(instanceHandle, offerHandles);
  };

  const filterOfferRecord = offerRecord =>
    filterObj(offerRecord, ['handle', 'instanceHandle', 'proposal']);

  const doGetCurrentAllocation = (offerHandle, brandKeywordRecord) => {
    const { currentAllocation } = offerTable.get(offerHandle);
    if (brandKeywordRecord === undefined) {
      return currentAllocation;
    }
    /** @type {AmountMathKeywordRecord} */
    const amountMathKeywordRecord = {};
    Object.getOwnPropertyNames(brandKeywordRecord).forEach(keyword => {
      const brand = brandKeywordRecord[keyword];
      amountMathKeywordRecord[keyword] = issuerTable.get(brand).amountMath;
    });
    return filterFillAmounts(currentAllocation, amountMathKeywordRecord);
  };

  const doGetCurrentAllocations = (offerHandles, brandKeywordRecords) => {
    if (brandKeywordRecords === undefined) {
      return offerHandles.map(offerHandle =>
        doGetCurrentAllocation(offerHandle),
      );
    }
    return offerHandles.map((offerHandle, i) =>
      doGetCurrentAllocation(offerHandle, brandKeywordRecords[i]),
    );
  };

  /**
   * Make a Zoe invite payment with an value that is a mix of credible
   * information from Zoe (the `handle` and `instanceHandle`) and
   * other information defined by the smart contract (the mandatory
   * `inviteDesc` and the optional `options.customProperties`).
   * Note that the smart contract cannot override or change the values
   * of `handle` and `instanceHandle`.
   *
   * @template OC - the offer outcome
   * @param {InstanceHandle} instanceHandle
   * @param {InviteHandler<OC>} inviteHandler
   * @param {string} inviteDesc
   * @param {Object} options
   * @returns {Invite<OC>}
   */
  const makeInvitation = (
    instanceHandle,
    inviteHandler,
    inviteDesc,
    options = harden({}),
  ) => {
    assert.typeof(
      inviteDesc,
      'string',
      details`expected an inviteDesc string: ${inviteDesc}`,
    );

    const { customProperties = harden({}) } = options;
    const inviteHandle = makeHandle('InviteHandle');
    const { installationHandle } = instanceTable.get(instanceHandle);
    const inviteAmount = inviteAmountMath.make(
      harden([
        {
          ...customProperties,
          inviteDesc,
          handle: inviteHandle,
          instanceHandle,
          installationHandle,
        },
      ]),
    );
    const handler = offerHandle => E(inviteHandler).invoke(offerHandle);
    inviteHandleToHandler.init(inviteHandle, handler);
    const invite = inviteMint.mintPayment(inviteAmount);
    return /** @type {Invite<OC>} */ (invite);
  };

  /**
   * drop zcfForZoe, offerHandles, adminNode.
   * @type {(record: any) => InstanceRecord}
   */
  const filterInstanceRecord = record =>
    filterObj(record, [
      'handle',
      'installationHandle',
      'publicAPI',
      'terms',
      'issuerKeywordRecord',
      'brandKeywordRecord',
    ]);

  /**
   * @param {InstanceHandle} instanceHandle
   * @param {PromiseRecord<PublicAPI>} publicApiE
   * @returns {ZoeForZcf}
   */
  const makeZoeForZcf = (instanceHandle, publicApiE) => {
    return harden({
      makeInvitation: (inviteHandler, inviteDesc, options = undefined) =>
        makeInvitation(instanceHandle, inviteHandler, inviteDesc, options),
      updateAmounts: (offerHandles, reallocations) =>
        offerTable.updateAmounts(offerHandles, reallocations),
      updatePublicAPI: publicAPI => publicApiE.resolve(publicAPI),
      addNewIssuer: (issuerE, keyword) =>
        issuerTable.getPromiseForIssuerRecord(issuerE).then(issuerRecord => {
          const { issuerKeywordRecord, brandKeywordRecord } = instanceTable.get(
            instanceHandle,
          );
          const newIssuerKeywordRecord = {
            ...issuerKeywordRecord,
            [keyword]: issuerRecord.issuer,
          };
          const newBrandKeywordRecord = {
            ...brandKeywordRecord,
            [keyword]: issuerRecord.brand,
          };
          instanceTable.update(instanceHandle, {
            issuerKeywordRecord: newIssuerKeywordRecord,
            brandKeywordRecord: newBrandKeywordRecord,
          });
        }),
      completeOffers: offerHandles =>
        completeOffers(instanceHandle, offerHandles),
    });
  };

  // The public Zoe service has four main methods: `install` takes
  // contract code and registers it with Zoe associated with an
  // `installationHandle` for identification, `makeInstance` creates
  // an instance from an installation, `getInstanceRecord` credibly
  // retrieves an instance from Zoe, and `offer` allows users to
  // securely escrow and get in return a record containing a promise for
  // payouts, a promise for the outcome of joining the contract,
  // and, depending on the exit conditions, perhaps a completeObj,
  // an object with a complete method for leaving the contract on demand.

  /** @type {ZoeService} */
  const zoeService = {
    getInviteIssuer: () => inviteIssuer,

    install: bundle => installationTable.create(harden({ bundle })),

    makeInstance: (
      installationHandle,
      issuerKeywordRecord = harden({}),
      terms = harden({}),
    ) => {
      assert(
        installationTable.has(installationHandle),
        details`${installationHandle} was not a valid installationHandle`,
      );
      const publicApiE = makePromiseKit();
      return E(vatAdminSvc)
        .createVat(zcfContractBundle)
        .then(({ root, adminNode }) => {
          /** @type {{ startContract: StartContract }} */
          const zcfRoot = root;
          const instanceHandle = makeHandle('InstanceHandle');
          const zoeForZcf = makeZoeForZcf(instanceHandle, publicApiE);

          const cleanedKeywords = cleanKeywords(issuerKeywordRecord);
          const issuersE = cleanedKeywords.map(
            keyword => issuerKeywordRecord[keyword],
          );
          const makeCleanup = _marker => {
            return () => {
              // console.log(`ZOE makeInstance  enter CLEANUP: ${marker} `);
              const { offerHandles } = instanceTable.get(instanceHandle);
              // This cleanup can't rely on ZCF to complete the offers since
              // it's invoked when ZCF is no longer accessible.
              completeOffers(instanceHandle, Array.from(offerHandles));
            };
          };

          // Build an entry for the instanceTable. It will contain zcfForZoe
          // which isn't available until ZCF starts. When ZCF starts up, it
          // will invoke the contract, which might make calls back to the Zoe
          // facet we provide, so InstanceRecord needs to be present by then.
          // We'll store an initial version of InstanceRecord before invoking
          // ZCF and fill in the zcfForZoe when we get it.
          const zcfForZoePromise = makePromiseKit();
          /** @type {Omit<InstanceRecord & PrivateInstanceRecord,'handle'>} */
          const instanceRecord = {
            installationHandle,
            publicAPI: publicApiE.promise,
            terms,
            issuerKeywordRecord: {},
            brandKeywordRecord: {},
            zcfForZoe: zcfForZoePromise.promise,
            offerHandles: new Set(),
          };
          const addIssuersToInstanceRecord = issuerRecords => {
            const issuers = issuerRecords.map(record => record.issuer);
            const cleanedIssuerKeywordRecord = arrayToObj(
              issuers,
              cleanedKeywords,
            );
            instanceRecord.issuerKeywordRecord = cleanedIssuerKeywordRecord;
            const brands = issuerRecords.map(record => record.brand);
            const brandKeywordRecord = arrayToObj(brands, cleanedKeywords);
            instanceRecord.brandKeywordRecord = brandKeywordRecord;
            instanceTable.create(instanceRecord, instanceHandle);
            E(adminNode)
              .done()
              .then(makeCleanup('done success'), makeCleanup('done reject'));
          };

          const callStartContract = () => {
            /** @type {InstanceRecord} */
            const instanceData = harden({
              handle: instanceHandle,
              installationHandle,
              publicAPI: instanceRecord.publicAPI,
              terms,
              adminNode,
              issuerKeywordRecord: instanceRecord.issuerKeywordRecord,
              brandKeywordRecord: instanceRecord.brandKeywordRecord,
            });
            const contractParams = harden({
              zoeService,
              bundle: installationTable.get(installationHandle).bundle,
              instanceData,
              zoeForZcf,
              inviteIssuer,
            });
            return E(zcfRoot).startContract(contractParams);
          };

          const finishContractInstall = ({ inviteE, zcfForZoe }) => {
            zcfForZoePromise.resolve(zcfForZoe);
            return inviteIssuer.isLive(inviteE).then(success => {
              assert(
                success,
                details`invites must be issued by the inviteIssuer.`,
              );

              function buildRecord(invite) {
                return {
                  invite,
                  instanceRecord: filterInstanceRecord(
                    instanceTable.get(instanceHandle),
                  ),
                };
              }

              return inviteE.then(buildRecord, makeCleanup('invite failure'));
            });
          };

          // The issuers may not have been seen before, so we must wait for the
          // issuer records to be available synchronously
          return issuerTable
            .getPromiseForIssuerRecords(issuersE)
            .then(addIssuersToInstanceRecord)
            .then(callStartContract)
            .then(finishContractInstall);
        });
    },

    getInstanceRecord: instanceHandle =>
      filterInstanceRecord(instanceTable.get(instanceHandle)),

    getOfferNotifier: offerHandle => {
      const { notifier } = offerTable.get(offerHandle);
      assert(notifier, `notifier is not set within Zoe`);
      return notifier;
    },

    offer: (
      invite,
      proposal = harden({}),
      paymentKeywordRecord = harden({}),
    ) => {
      return inviteIssuer.burn(invite).then(inviteAmount => {
        assert(
          inviteAmount.value.length === 1,
          'only one invite should be redeemed',
        );
        const giveKeywords = proposal.give
          ? Object.getOwnPropertyNames(proposal.give)
          : [];
        const wantKeywords = proposal.want
          ? Object.getOwnPropertyNames(proposal.want)
          : [];
        const userKeywords = harden([...giveKeywords, ...wantKeywords]);

        const cleanedProposal = cleanProposal(getAmountMathForBrand, proposal);

        const paymentDepositedPs = userKeywords.map(keyword => {
          if (giveKeywords.includes(keyword)) {
            // We cannot trust the amount in the proposal, so we use our
            // cleaned proposal's amount that should be the same.
            const giveAmount = cleanedProposal.give[keyword];
            const { purse } = issuerTable.get(giveAmount.brand);
            return E(purse).deposit(paymentKeywordRecord[keyword], giveAmount);
            // eslint-disable-next-line no-else-return
          } else {
            // payments outside the give: clause are ignored.
            return getAmountMathForBrand(
              cleanedProposal.want[keyword].brand,
            ).getEmpty();
          }
        });

        const {
          value: [{ instanceHandle, handle: inviteHandle }],
        } = inviteAmount;
        const offerHandle = makeHandle('OfferHandle');

        // recordOffer() creates and stores a record in the offerTable. The
        // allocations are according to the keywords in the offer's proposal,
        // which are not required to match anything in the issuerKeywordRecord
        // that was used to instantiate the contract. recordOffer() is called
        // on amountsArray, which includes amounts for all the keywords in the
        // proposal. Keywords in the give clause are mapped to the amount
        // deposited. Keywords in the want clause are mapped to the empty
        // amount for that keyword's Issuer.
        const recordOffer = amountsArray => {
          /** @type {NotifierRecord<Allocation|undefined>} */
          const notifierKit = makeNotifierKit(undefined);
          /** @type {Omit<OfferRecord & PrivateOfferRecord, 'handle'>} */
          const offerRecord = {
            instanceHandle,
            proposal: cleanedProposal,
            currentAllocation: arrayToObj(amountsArray, userKeywords),
            notifier: notifierKit.notifier,
            updater: notifierKit.updater,
          };
          const { zcfForZoe } = instanceTable.get(instanceHandle);
          payoutMap.init(offerHandle, makePromiseKit());
          offerTable.create(offerRecord, offerHandle);
          instanceTable.addOffer(instanceHandle, offerHandle);
          return E(zcfForZoe).addOffer(
            offerHandle,
            cleanedProposal,
            offerRecord.currentAllocation,
          );
        };

        const makeOfferResult = completeObj => {
          const offerHandler = inviteHandleToHandler.get(inviteHandle);
          const offerOutcome = offerHandler(offerHandle).catch(err => {
            completeOffers(instanceHandle, [offerHandle]);
            throw err;
          });
          const offerResult = {
            offerHandle: E.when(offerHandle),
            payout: payoutMap.get(offerHandle).promise,
            outcome: offerOutcome,
            completeObj,
          };
          return harden(offerResult);
        };
        return Promise.all(paymentDepositedPs)
          .then(recordOffer)
          .then(makeOfferResult);
      });
    },

    isOfferActive: offerTable.isOfferActive,
    getOffers: offerHandles =>
      offerTable.getOffers(offerHandles).map(filterOfferRecord),
    getOffer: offerHandle => filterOfferRecord(offerTable.get(offerHandle)),
    getCurrentAllocation: (offerHandle, brandKeywordRecord) =>
      doGetCurrentAllocation(offerHandle, brandKeywordRecord),
    getCurrentAllocations: (offerHandles, brandKeywordRecords) =>
      doGetCurrentAllocations(offerHandles, brandKeywordRecords),
    getInstallation: installationHandle =>
      installationTable.get(installationHandle).bundle,
  };

  return harden(zoeService);
}

export { makeZoe };
