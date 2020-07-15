/* global harden */
// @ts-check

import { E, HandledPromise } from '@agoric/eventual-send';
import makeStore from '@agoric/weak-store';
import makeIssuerKit from '@agoric/ertp';
import { assert, details } from '@agoric/assert';
import { produceNotifier } from '@agoric/notifier';
import { producePromise } from '@agoric/produce-promise';

import { cleanProposal, cleanKeywords } from './cleanProposal';
import { arrayToObj, filterFillAmounts, filterObj } from './objArrayConversion';
import { makeZoeTables } from './state';

// This is the Zoe contract facet from contractFacet.js, packaged as a bundle
// that can be used to create a new vat. Every time it is edited, it must be
// manually rebuilt with `yarn build-zcfBundle`.

/* eslint-disable-next-line import/no-unresolved, import/extensions */
import zcfContractBundle from '../bundles/bundle-contractFacet';

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 */

/**
 * @typedef {import('@agoric/ertp').Amount} Amount
 * @typedef {import('@agoric/ertp').Brand} Brand
 * @typedef {import('@agoric/ertp').AmountMath} AmountMath
 * @typedef {import('@agoric/ertp').Payment} Payment
 * @typedef {import('@agoric/ertp').Issuer} Issuer
 * @typedef {import('@agoric/ertp').Purse} Purse
 *
 * @typedef {any} TODO Needs to be typed
 * @typedef {string} Keyword
 * @typedef {{}} InstallationHandle
 * @typedef {Object.<string,Issuer>} IssuerKeywordRecord
 * @typedef {Object.<string,Brand>} BrandKeywordRecord
 * @typedef {Object} Bundle
 * @property {string} source
 * @property {string} sourceMap
 * @property {string} moduleFormat
 */

/**
 * There doesn't seem to be any way in JSDoc to specify a record consisting of
 * an arbitrary number of key-value pairs of specified type.
 * @typedef {Object.<string,Payment>} PaymentKeywordRecord
 * @typedef {Object.<string,Promise<Payment>>} PaymentPKeywordRecord
 */

/**
 * @typedef {Object} ZoeService
 * Zoe provides a framework for deploying and working with smart contracts. It
 * is accessed as a long-lived and well-trusted service that enforces offer
 * safety for the contracts that use it. Zoe has a single `inviteIssuer` for
 * the entirety of its lifetime. By having a reference to Zoe, a user can get
 * the `inviteIssuer` and thus validate any `invite` they receive from someone
 * else.
 *
 * Zoe has two different facets: the public Zoe service and the contract facet
 * (ZCF). Each contract instance has a copy of ZCF within its vat. The contract
 * and ZCF never have direct access to the users' payments or the Zoe purses.
 * The contract can only do a few things through ZCF. It can propose a
 * reallocation of amount or complete an offer. It can also speak directly to Zoe
 * outside of its vat, and create a new offer for record-keeping and other
 * purposes.
 *
 * @property {() => Issuer} getInviteIssuer
 * Zoe has a single `inviteIssuer` for the entirety of its lifetime.
 * By having a reference to Zoe, a user can get the `inviteIssuer`
 * and thus validate any `invite` they receive from someone else. The
 * mint associated with the inviteIssuer creates the ERTP payments
 * that represent the right to interact with a smart contract in
 * particular ways.
 *
 * @property {(bundle: Bundle, moduleFormat?: string) => InstallationHandle} install
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installationHandle.
 *
 * @property {(installationHandle: InstallationHandle,
 *             issuerKeywordRecord: IssuerKeywordRecord,
 *             terms?: object)
 *            => Promise<InviteIssuerRecord>} makeInstance
 * Zoe is long-lived. We can use Zoe to create smart contract
 * instances by specifying a particular contract installation to
 * use, as well as the `issuerKeywordRecord` and `terms` of the contract. The
 * `issuerKeywordRecord` is a record mapping string names (keywords) to issuers,
 * such as `{ Asset: simoleanIssuer}`. (Note that the keywords must
 * begin with a capital letter and must be ASCII identifiers.) Parties to the
 * contract will use the keywords to index their proposal and
 * their payments.
 *
 * Terms are the arguments to the contract,
 * such as the number of bids an auction will wait for before closing.
 * Terms are up to the discretion of the smart contract. We get back
 * an invite (an ERTP payment) to participate in the contract.
 *
 * @property {(InstanceHandle) => InstanceRecord} getInstanceRecord
 * Credibly get information about the instance (such as the installation
 * and terms used).
 *
 * @property {(invite: Invite,
 *             proposal?: Proposal,
 *             paymentKeywordRecord?: PaymentKeywordRecord)
 *            => Promise<OfferResultRecord>} offer
 * To redeem an invite, the user normally provides a proposal (their rules for the
 * offer) as well as payments to be escrowed by Zoe.  If either the proposal or payments
 * would be empty, indicate this by omitting that argument or passing undefined, rather
 * than passing an empty record.
 *
 * The proposal has three parts: `want` and `give` are used
 * by Zoe to enforce offer safety, and `exit` is used to specify
 * the particular payout-liveness policy that Zoe can guarantee.
 * `want` and `give` are objects with keywords as keys and amounts
 * as values. `paymentKeywordRecord` is a record with keywords as keys,
 * and the values are the actual payments to be escrowed. A payment
 * is expected for every rule under `give`.
 *
 * @property {(offerHandle: OfferHandle) => boolean} isOfferActive
 * @property {(offerHandles: OfferHandle[]) => OfferRecord[]} getOffers
 * @property {(offerHandle: OfferHandle) => OfferRecord} getOffer
 * @property {(offerHandle: OfferHandle, brandKeywordRecord?: BrandKeywordRecords) => Allocation} getCurrentAllocation
 * @property {(offerHandles: OfferHandle[], brandKeywordRecord[]?: BrandKeywordRecords) => Allocation[]} getCurrentAllocations
 * @property {(installationHandle: InstallationHandle) => string} getInstallation
 * Get the source code for the installed contract. Throws an error if the
 * installationHandle is not found.
 *
 * @typedef {() => undefined} CompleteObj
 *
 * @typedef {any} OfferOutcome
 * A contract-specific value that is returned by the OfferHook.
 *
 * @typedef {Object} OfferResultRecord This is returned by a call to `offer` on Zoe.
 * @property {OfferHandle} offerHandle
 * @property {Promise<PaymentPKeywordRecord>} payout A promise that resolves
 * to a record which has keywords as keys and promises for payments
 * as values. Note that while the payout promise resolves when an offer
 * is completed, the promise for each payment resolves after the remote
 * issuer successfully withdraws the payment.
 *
 * @property {Promise<OfferOutcome>} outcome Note that if the offerHook throws,
 * this outcome Promise will reject, but the rest of the OfferResultRecord is
 * still meaningful.
 *
 * @property {CompleteObj=} completeObj
 * completeObj will only be present if exitKind was 'onDemand'
 *
 * @typedef {{give?:AmountKeywordRecord,want?:AmountKeywordRecord,exit?:ExitRule}} Proposal
 *
 * @typedef {Object.<string,Amount>} AmountKeywordRecord
 *
 * The keys are keywords, and the values are amounts. For example:
 * { Asset: amountMath.make(5), Price: amountMath.make(9) }
 *
 * @typedef {AmountKeywordRecord[]} AmountKeywordRecords
 *
 * @typedef {Object} MakeInstanceResult
 * @property {Invite} invite
 * @property {InstanceRecord} instanceRecord
 */

/**
 * @typedef {Object} Timer
 * @typedef {number} Deadline
 *
 * @typedef {{waived:null}} Waived
 * @typedef {{onDemand:null}} OnDemand
 *
 * @typedef {{afterDeadline:{timer:Timer, deadline:Deadline}}} AfterDeadline
 *
 * @typedef {(Waived|OnDemand|AfterDeadline)} ExitRule
 * The possible keys are 'waived', 'onDemand', and 'afterDeadline'.
 * `timer` and `deadline` only are used for the `afterDeadline` key.
 * The possible records are:
 * `{ waived: null }`
 * `{ onDemand: null }`
 * `{ afterDeadline: { timer :Timer<Deadline>, deadline :Deadline } }
 */

/**
 * @typedef {Object} Invite
 * An invitation to participate in a Zoe contract.
 * Invites are Payments, so they can be transferred, stored in Purses, and
 * verified. Only Zoe can create new Invites.
 * @property {() => Brand} getAllegedBrand
 */

/**
 * @callback MakeContract The type exported from a Zoe contract
 * @param {ContractFacet} zcf The Zoe Contract Facet
 * @returns {Invite} invite The closely-held administrative invite
 */

/**
 * @typedef {{}} InstanceHandle - an opaque handle for a contract instance
 * @typedef {{}} OfferHandle - an opaque handle for an offer
 * @typedef {{}} InviteHandle - an opaque handle for an invite
 * @typedef {Object} CustomProperties
 *
 * @typedef {object} OfferRecord
 * @property {OfferHandle} handle - opaque identifier for the offer, used as the key
 * @property {InstanceHandle} instanceHandle - opaque identifier for the instance
 * @property {Proposal} proposal - the offer proposal (including want, give, exit)
 * @property {AmountKeywordRecord} amounts - the amountKeywordRecord that will be turned into payouts
 *
 * @typedef {object} InstanceRecord
 * @property {InstanceHandle} handle - opaque identifier for the instance, used as the table key
 * @property {InstallationHandle} installationHandle - opaque identifier for the installation
 * @property {Object.<string,function>} publicAPI - the invite-free publicly accessible API for the contract
 * @property {Object} terms - contract parameters
 * @property {IssuerKeywordRecord} issuerKeywordRecord - record with keywords keys, issuer values
 * @property {BrandKeywordRecord} brandKeywordRecord - record with
 * keywords keys, brand values
 *
 * @typedef {TODO} IssuerRecord
 *
 * @typedef {Object} InstallationRecord
 * @property {{}} handle - opaque identifier, used as the table key
 * @property {string} installation - contract code
 *
 * @typedef {Object} OfferStatus
 * @property {OfferHandle[]} active
 * @property {OfferHandle[]} inactive
 *
 * @typedef {Keyword[]} SparseKeywords
 * @typedef {{[Keyword:string]:Amount}} Allocation
 * @typedef {{[Keyword:string]:AmountMath}} AmountMathKeywordRecord
 */

/**
 * Create an instance of Zoe.
 *
 * @param {Object} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @returns {ZoeService} The created Zoe service.
 */
function makeZoe(vatAdminSvc) {
  // A weakMap from the inviteHandles to contract offerHook upcalls
  const inviteHandleToHandler = makeStore('inviteHandle');

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

  const removeAmountsAndNotifier = offerRecord =>
    filterObj(offerRecord, ['handle', 'instanceHandle', 'proposal']);

  const doGetCurrentAllocation = (offerHandle, brandKeywordRecord) => {
    const { currentAllocation } = offerTable.get(offerHandle);
    if (brandKeywordRecord === undefined) {
      return currentAllocation;
    }
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

  // Make a Zoe invite payment with an value that is a mix of credible
  // information from Zoe (the `handle` and `instanceHandle`) and
  // other information defined by the smart contract (the mandatory
  // `inviteDesc` and the optional `options.customProperties`).
  // Note that the smart contract cannot override or change the values
  // of `handle` and `instanceHandle`.
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
    const inviteHandle = harden({});
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
    return inviteMint.mintPayment(inviteAmount);
  };

  // drop zcfForZoe, offerHandles, adminNode.
  const filterInstanceRecord = record =>
    filterObj(record, [
      'handle',
      'installationHandle',
      'publicAPI',
      'terms',
      'issuerKeywordRecord',
      'brandKeywordRecord',
    ]);

  const makeZoeForZcf = (instanceHandle, publicApiP) => {
    return harden({
      makeInvitation: (...params) => makeInvitation(instanceHandle, ...params),
      updateAmounts: (offerHandles, reallocations) =>
        offerTable.updateAmounts(offerHandles, reallocations),
      updatePublicAPI: publicAPI => publicApiP.resolve(publicAPI),
      addNewIssuer: (issuerP, keyword) =>
        issuerTable.getPromiseForIssuerRecord(issuerP).then(issuerRecord => {
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
  const zoeService = harden({
    getInviteIssuer: () => inviteIssuer,

    /**
     * Create an installation by permanently storing the bundle. It will be
     * evaluated each time it is used to make a new instance of a contract.
     */
    install: bundle => installationTable.create(harden({ bundle })),

    /**
     * Makes a contract instance from an installation and returns the
     * invitation and InstanceRecord.
     *
     * @param  {object} installationHandle - the unique handle for the
     * installation
     * @param {Object.<string,Issuer>} issuerKeywordRecord - a record mapping
     * keyword keys to issuer values
     * @param  {object} terms - optional, arguments to the contract. These
     * arguments depend on the contract.
     * @returns {MakeInstanceResult}
     */
    makeInstance: (
      installationHandle,
      issuerKeywordRecord = harden({}),
      terms = harden({}),
    ) => {
      assert(
        installationTable.has(installationHandle),
        details`${installationHandle} was not a valid installationHandle`,
      );
      const publicApiP = producePromise();
      return E(vatAdminSvc)
        .createVat(zcfContractBundle)
        .then(({ root: zcfRoot, adminNode }) => {
          const instanceHandle = harden({});
          const zoeForZcf = makeZoeForZcf(instanceHandle, publicApiP);

          const cleanedKeywords = cleanKeywords(issuerKeywordRecord);
          const issuersP = cleanedKeywords.map(
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
          const zcfForZoePromise = producePromise();
          const instanceRecord = {
            installationHandle,
            publicAPI: publicApiP.promise,
            terms,
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
              .then(makeCleanup('doneSuccess'), makeCleanup('done reject'));
          };

          const callStartContract = () => {
            const instanceData = harden({
              instanceHandle,
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

          const finishContractInstall = ({ inviteP, zcfForZoe }) => {
            zcfForZoePromise.resolve(zcfForZoe);
            return inviteIssuer.isLive(inviteP).then(success => {
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

              return inviteP.then(buildRecord, makeCleanup('invite failure'));
            });
          };

          // The issuers may not have been seen before, so we must wait for the
          // issuer records to be available synchronously
          return issuerTable
            .getPromiseForIssuerRecords(issuersP)
            .then(addIssuersToInstanceRecord)
            .then(callStartContract)
            .then(finishContractInstall);
        });
    },

    /**
     * Credibly retrieves an instance record given an instanceHandle.
     * @param {object} instanceHandle - the unique, unforgeable
     * identifier (empty object) for the instance
     */
    getInstanceRecord: instanceHandle =>
      filterInstanceRecord(instanceTable.get(instanceHandle)),

    /** Get a notifier (see @agoric/notify) for the offer. */
    getOfferNotifier: offerHandle => offerTable.get(offerHandle).notifier,

    /**
     * Redeem the invite to receive a payout promise and an
     * outcome promise.
     * @param {Invite} invite - an invite (ERTP payment) to join a
     * Zoe smart contract instance
     * @param  {Proposal?} proposal - the proposal, a record
     * with properties `want`, `give`, and `exit`. The keys of
     * `want` and `give` are keywords and the values are amounts.
     * @param  {Object.<string,Payment>?} paymentKeywordRecord - a record with
     * keyword keys and values which are payments that will be escrowed by
     * Zoe.
     * @returns OfferResultRecord
     *
     * The default arguments allow remote invocations to specify empty
     * objects. Otherwise, explicitly-provided empty objects would be
     * marshaled as presences.
     */
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
        const offerHandle = harden({});

        // recordOffer() creates and stores a record in the offerTable. The
        // allocations are according to the keywords in the offer's proposal,
        // which are not required to match anything in the issuerKeywordRecord
        // that was used to instantiate the contract. recordOffer() is called
        // on amountsArray, which includes amounts for all the keywords in the
        // proposal. Keywords in the give clause are mapped to the amount
        // deposited. Keywords in the want clause are mapped to the empty
        // amount for that keyword's Issuer.
        const recordOffer = amountsArray => {
          const notifierRec = produceNotifier();
          const offerRecord = {
            instanceHandle,
            proposal: cleanedProposal,
            currentAllocation: arrayToObj(amountsArray, userKeywords),
            notifier: notifierRec.notifier,
            updater: notifierRec.updater,
          };
          const { zcfForZoe } = instanceTable.get(instanceHandle);
          payoutMap.init(offerHandle, producePromise());
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
          const offerResult = {
            offerHandle: HandledPromise.resolve(offerHandle),
            payout: payoutMap.get(offerHandle).promise,
            outcome: offerHandler(offerHandle),
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
      offerTable.getOffers(offerHandles).map(removeAmountsAndNotifier),
    getOffer: offerHandle =>
      removeAmountsAndNotifier(offerTable.get(offerHandle)),
    getCurrentAllocation: (offerHandle, brandKeywordRecord) =>
      doGetCurrentAllocation(offerHandle, brandKeywordRecord),
    getCurrentAllocations: (offerHandles, brandKeywordRecords) =>
      doGetCurrentAllocations(offerHandles, brandKeywordRecords),
    getInstallation: installationHandle =>
      installationTable.get(installationHandle).bundle,
  });

  return zoeService;
}

export { makeZoe };
