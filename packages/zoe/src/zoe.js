// @ts-check
import harden from '@agoric/harden';
import { E, HandledPromise } from '@agoric/eventual-send';
import makeStore from '@agoric/weak-store';
import produceIssuer from '@agoric/ertp';
import { assert, details, openDetail } from '@agoric/assert';
import { produceNotifier } from '@agoric/notifier';
import { producePromise } from '@agoric/produce-promise';

import {
  cleanProposal,
  assertCapASCII,
  getKeywords,
  cleanKeywords,
} from './cleanProposal';
import {
  arrayToObj,
  objToArray,
  objToArrayAssertFilled,
  filterObj,
  filterFillAmounts,
  assertSubset,
} from './objArrayConversion';
import { isOfferSafeForAll } from './offerSafety';
import { areRightsConserved } from './rightsConservation';
import { evalContractCode } from './evalContractCode';
import { makeTables } from './state';

// TODO Update types and documentatuon to describe the new API
/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 */

/**
 * @typedef {import('@agoric/ertp/src/issuer').Amount} Amount
 * @typedef {import('@agoric/ertp/src/issuer').Brand} Brand
 * @typedef {import('@agoric/ertp/src/amountMath').AmountMath} AmountMath
 * @typedef {import('@agoric/ertp/src/issuer').Payment} Payment
 * @typedef {import('@agoric/ertp/src/issuer').Issuer} Issuer
 * @typedef {import('@agoric/ertp/src/issuer').Purse} Purse
 *
 * @typedef {any} TODO Needs to be typed
 * @typedef {string} Keyword
 * @typedef {{}} InstallationHandle
 * @typedef {Object.<string,Issuer>} IssuerKeywordRecord
 */

/**
 * There doesn't seem to be any way in JSDoc to specify a record consisting of
 * an arbitrary number of key-value pairs of specified type.
 * @typedef {Object.<string,Payment>} PaymentKeywordRecord
 */

/**
 * @typedef {Object} ZoeService
 * Zoe provides a framework for deploying and working with smart contracts. It
 * is accessed as a long-lived and well-trusted service that enforces offer
 * safety for the contracts that use it. Zoe has a single `inviteIssuer` for
 * the entirety of its lifetime. By having a reference to Zoe, a user can get
 * the `inviteIssuer` and thus validate any `invite` they receive from someone
 * else.
 * @property {() => Issuer} getInviteIssuer
 * Zoe has a single `inviteIssuer` for the entirety of its lifetime.
 * By having a reference to Zoe, a user can get the `inviteIssuer`
 * and thus validate any `invite` they receive from someone else. The
 * mint associated with the inviteIssuer creates the ERTP payments
 * that represent the right to interact with a smart contract in
 * particular ways.
 *
 * @property {(code: string, moduleFormat: string) => InstallationHandle} install
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installationHandle.
 *
 * @property {(installationHandle: InstallationHandle,
 *             issuerKeywordRecord: IssuerKeywordRecord,
 *             terms: object?)
 *            => Invite} makeInstance
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
 * @property {(offerHandle: OfferHandle, sparseKeywords: SparseKeywords) => Allocation} getCurrentAllocation
 * @property {(offerHandles: OfferHandle[], sparseKeywords: SparseKeywords) => Allocation[]} getCurrentAllocations
 * @property {(installationHandle: InstallationHandle) => string} getInstallation
 * Get the source code for the installed contract. Throws an error if the
 * installationHandle is not found.
 *
 * @typedef {any} OfferOutcome
 * A contract-specific value that is returned by the OfferHook.
 *
 * @typedef {Object} OfferResultRecord This is returned by a call to `offer` on Zoe.
 * @property {OfferHandle} offerHandle
 * @property {Promise<PaymentKeywordRecord>} payout A promise that resolves
 * to a record which has keywords as keys and promises for payments
 * as values. Note that while the payout promise resolves when an offer
 * is completed, the promise for each payment resolves after the remote
 * issuer successfully withdraws the payment.
 *
 * @property {Promise<OfferOutcome>} outcome Note that if the offerHook throws,
 * this outcome Promise will reject, but the rest of the OfferResultRecord is
 * still meaningful.
 * @property {(() => undefined)} [completeObj]
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
 * @returns {ContractInstance} The instantiated contract
 *
 * @typedef {Object} ContractInstance
 * @property {Invite} invite The closely-held administrative invite
 * @property {Object.<string,function>} publicAPI Public functions that can be called on the instance
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
 */

/**
 * @typedef {Object} ContractFacet
 * The Zoe interface specific to a contract instance.
 * The Zoe Contract Facet is an API object used by running contract instances to
 * access the Zoe state for that instance. The Zoe Contract Facet is accessed
 * synchronously from within the contract, and usually is referred to in code as
 * zcf.
 * @property {Reallocate} reallocate Propose a reallocation of extents per offer
 * @property {Complete} complete Complete an offer
 * @property {MakeInvitation} makeInvitation
 * @property {AddNewIssuer} addNewIssuer
 * @property {() => ZoeService} getZoeService
 * @property {() => Issuer} getInviteIssuer
 * @property {(sparseKeywords: SparseKeywords) => {[Keyword:string]:AmountMath}} getAmountMaths
 * @property {(offerHandles: OfferHandle[]) => { active: OfferStatus[], inactive: OfferStatus[] }} getOfferStatuses
 * @property {(offerHandle: OfferHandle) => boolean} isOfferActive
 * @property {(offerHandles: OfferHandle[]) => OfferRecord[]} getOffers
 * @property {(offerHandle: OfferHandle) => OfferRecord} getOffer
 * @property {(offerHandle: OfferHandle, sparseKeywords?: SparseKeywords) => Allocation} getCurrentAllocation
 * @property {(offerHandles: OfferHandle[], sparseKeywords?: SparseKeywords) => Allocation[]} getCurrentAllocations
 * @property {() => InstanceRecord} getInstanceRecord
 * @property {(issuer: Issuer) => IssuerRecord} getIssuerRecord
 *
 * @callback Reallocate
 * The contract can propose a reallocation of extents per offer,
 * which will only succeed if the reallocation 1) conserves
 * rights, and 2) is 'offer-safe' for all parties involved. This
 * reallocation is partial, meaning that it applies only to the
 * amount associated with the offerHandles that are passed in.
 * We are able to ensure that with each reallocation, rights are
 * conserved and offer safety is enforced for all offers, even
 * though the reallocation is partial, because once these
 * invariants are true, they will remain true until changes are
 * made.
 * zcf.reallocate will throw an error if any of the
 * newAllocations do not have a value for all the
 * keywords in sparseKeywords. An error will also be thrown if
 * any newAllocations have keywords that are not in
 * sparseKeywords.
 *
 * @param  {OfferHandle[]} offerHandles An array of offerHandles
 * @param  {AmountKeywordRecord[]} newAllocations An
 * array of amountKeywordRecords  - objects with keyword keys
 * and amount values, with one keywordRecord per offerHandle.
 * @param  {Keyword[]=} sparseKeywords An array of string
 * keywords, which may be a subset of allKeywords
 * @returns {TODO}
 *
 * @callback Complete
 * The contract can "complete" an offer to remove it from the
 * ongoing contract and resolve the player's payouts (either
 * winnings or refunds). Because Zoe only allows for
 * reallocations that conserve rights and are 'offer-safe', we
 * don't need to do those checks at this step and can assume
 * that the invariants hold.
 * @param  {OfferHandle[]} offerHandles - an array of offerHandles
 * @returns {void}
 *
 * @callback MakeInvitation
 * Make a credible Zoe invite for a particular smart contract
 * indicated by the unique `instanceHandle`. The other
 * information in the extent of this invite is decided by the
 * governing contract and should include whatever information is
 * necessary for a potential buyer of the invite to know what
 * they are getting. Note: if information can be derived in
 * queries based on other information, we choose to omit it. For
 * instance, `installationHandle` can be derived from
 * `instanceHandle` and is omitted even though it is useful.
 * @param {OfferHook} offerHook - a function that will be handed the
 * offerHandle at the right time, and returns a contract-specific
 * OfferOutcome which will be put in the OfferResultRecord.
 * @param {string} inviteDesc
 * @param {MakeInvitationOptions} [options]
 * @returns {Invite}
 *
 * @typedef MakeInvitationOptions
 * @property {CustomProperties} [customProperties] - an object of
 * information to include in the extent, as defined by the smart
 * contract
 *
 * @callback OfferHook
 * This function will be called with the OfferHandle when the offer
 * is prepared. It should return a contract-specific "OfferOutcome"
 * value that will be put in the OfferResultRecord.
 * @param {OfferHandle} offerHandle
 * @returns {OfferOutcome}
 *
 *
 * @callback AddNewIssuer
 * Informs Zoe about an issuer and returns a promise for acknowledging
 * when the issuer is added and ready.
 * @param {Promise<Issuer>|Issuer} issuerP Promise for issuer
 * @param {Keyword} keyword Keyword for added issuer
 * @returns {Promise<IssuerRecord>} Issuer is added and ready
 */

/**
 * Create an instance of Zoe.
 *
 * @param {Object.<string,any>} [additionalEndowments] pure or pure-ish
 * endowments to add to evaluator
 * @returns {ZoeService} The created Zoe service.
 */
const makeZoe = (additionalEndowments = {}) => {
  // Zoe maps the inviteHandles to contract offerHook upcalls
  const inviteHandleToOfferHook = makeStore();
  const {
    mint: inviteMint,
    issuer: inviteIssuer,
    amountMath: inviteAmountMath,
  } = produceIssuer('zoeInvite', 'set');

  // All of the Zoe state is stored in these tables built on WeakMaps
  const {
    installationTable,
    instanceTable,
    offerTable,
    payoutMap,
    issuerTable,
  } = makeTables();

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

    const { issuerKeywordRecord } = instanceTable.get(instanceHandle);

    // Remove the offers from the offerTable so that they are no
    // longer active.
    offerTable.deleteOffers(offerHandles);

    // Resolve the payout promises with promises for the payouts
    const pursePKeywordRecord = issuerTable.getPurseKeywordRecord(
      issuerKeywordRecord,
    );
    for (const offerRecord of offerRecords) {
      const payout = {};
      Object.keys(offerRecord.currentAllocation).forEach(keyword => {
        payout[keyword] = E(pursePKeywordRecord[keyword]).withdraw(
          offerRecord.currentAllocation[keyword],
        );
      });
      harden(payout);
      payoutMap.get(offerRecord.handle).resolve(payout);
    }
  };

  const getAmountMaths = (instanceHandle, sparseKeywords) => {
    const amountMathKeywordRecord = /** @type {Object.<string,AmountMath>} */ ({});
    const { issuerKeywordRecord } = instanceTable.get(instanceHandle);
    sparseKeywords.forEach(keyword => {
      const issuer = issuerKeywordRecord[keyword];
      amountMathKeywordRecord[keyword] = issuerTable.get(issuer).amountMath;
    });
    return harden(amountMathKeywordRecord);
  };

  const removePurse = issuerRecord =>
    filterObj(issuerRecord, ['issuer', 'brand', 'amountMath']);

  const removeAmountsAndNotifier = offerRecord =>
    filterObj(offerRecord, ['handle', 'instanceHandle', 'proposal']);

  const assertOffersHaveInstanceHandle = (
    offerHandles,
    expectedInstanceHandle,
  ) => {
    offerHandles.forEach(offerHandle => {
      assert(
        offerTable.get(offerHandle).instanceHandle === expectedInstanceHandle,
        details`contract instances can only access their own associated offers`,
      );
    });
  };

  const doGetCurrentAllocation = (
    instanceHandle,
    offerHandle,
    sparseKeywords,
  ) => {
    const { issuerKeywordRecord } = instanceTable.get(instanceHandle);
    const allKeywords = getKeywords(issuerKeywordRecord);
    if (sparseKeywords === undefined) {
      sparseKeywords = allKeywords;
    }
    const amountMathKeywordRecord = getAmountMaths(
      instanceHandle,
      sparseKeywords,
    );
    assertSubset(allKeywords, sparseKeywords);
    const { currentAllocation } = offerTable.get(offerHandle);
    return filterFillAmounts(
      currentAllocation,
      sparseKeywords,
      amountMathKeywordRecord,
    );
  };

  // Zoe has two different facets: the public Zoe service and the
  // contract facet. The contract facet is what is accessible to the
  // smart contract instance and is remade for each instance. The
  // contract at no time has access to the users' payments or the Zoe
  // purses. The contract can only do a few things through the Zoe
  // contract facet. It can propose a reallocation of amount,
  // complete an offer, and can create a new offer itself for
  // record-keeping and other various purposes.

  /**
   * Create the contract facet.
   *
   * @param {InstanceHandle} instanceHandle The instance for which to create the facet
   * @returns {ContractFacet} The returned facet
   */
  const makeContractFacet = instanceHandle => {
    /**
     * @type {ContractFacet}
     */
    const contractFacet = harden({
      reallocate: (offerHandles, newAllocations, sparseKeywords) => {
        assertOffersHaveInstanceHandle(offerHandles, instanceHandle);
        // We may want to handle this with static checking instead.
        // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
        assert(
          offerHandles.length >= 2,
          details`reallocating must be done over two or more offers`,
        );
        const { issuerKeywordRecord } = instanceTable.get(instanceHandle);
        const allKeywords = getKeywords(issuerKeywordRecord);
        if (sparseKeywords === undefined) {
          sparseKeywords = allKeywords;
        }

        const newAmountMatrix = newAllocations.map(amountObj =>
          objToArrayAssertFilled(amountObj, sparseKeywords),
        );

        const offerRecords = offerTable.getOffers(offerHandles);

        const proposals = offerRecords.map(offerRecord => offerRecord.proposal);
        const currentAmountMatrix = offerRecords.map(({ handle }) => {
          const filteredAmounts = contractFacet.getCurrentAllocation(
            handle,
            sparseKeywords,
          );
          return objToArray(filteredAmounts, sparseKeywords);
        });
        const amountMathKeywordRecord = contractFacet.getAmountMaths(
          sparseKeywords,
        );
        const amountMathsArray = objToArray(
          amountMathKeywordRecord,
          sparseKeywords,
        );

        // 1) ensure that rights are conserved
        assert(
          areRightsConserved(
            amountMathsArray,
            currentAmountMatrix,
            newAmountMatrix,
          ),
          details`Rights are not conserved in the proposed reallocation`,
        );

        // 2) ensure 'offer safety' for each player
        assert(
          isOfferSafeForAll(amountMathKeywordRecord, proposals, newAllocations),
          details`The proposed reallocation was not offer safe`,
        );

        // 3) save the reallocation
        offerTable.updateAmounts(offerHandles, harden(newAllocations));
      },

      complete: offerHandles => {
        assertOffersHaveInstanceHandle(offerHandles, instanceHandle);
        return completeOffers(instanceHandle, offerHandles);
      },

      // Make a Zoe invite payment with an extent that is a mix of credible
      // information from Zoe (the `handle` and `instanceHandle`) and
      // other information defined by the smart contract (the mandatory
      // `inviteDesc` and the optional`options.customProperties`).
      // Note that the smart contract cannot override or change the values
      // of `handle` and `instanceHandle`.
      makeInvitation: (offerHook, inviteDesc, options = harden({})) => {
        assert.typeof(
          inviteDesc,
          'string',
          details`expected an inviteDesc string: ${inviteDesc}`,
        );
        const { customProperties = harden({}) } = options;
        const inviteHandle = harden({});
        const inviteAmount = inviteAmountMath.make(
          harden([
            {
              ...customProperties,
              inviteDesc,
              handle: inviteHandle,
              instanceHandle,
            },
          ]),
        );
        inviteHandleToOfferHook.init(inviteHandle, offerHook);
        return inviteMint.mintPayment(inviteAmount);
      },

      addNewIssuer: (issuerP, keyword) =>
        issuerTable.getPromiseForIssuerRecord(issuerP).then(issuerRecord => {
          assertCapASCII(keyword);
          const { issuerKeywordRecord } = instanceTable.get(instanceHandle);
          assert(
            !getKeywords(issuerKeywordRecord).includes(keyword),
            details`keyword ${keyword} must be unique`,
          );
          const newIssuerKeywordRecord = {
            ...issuerKeywordRecord,
            [keyword]: issuerRecord.issuer,
          };
          instanceTable.update(instanceHandle, {
            issuerKeywordRecord: newIssuerKeywordRecord,
          });
          return removePurse(issuerRecord);
        }),

      // eslint-disable-next-line no-use-before-define
      getZoeService: () => zoeService,

      // The methods below are pure and have no side-effects //
      getInviteIssuer: () => inviteIssuer,
      getAmountMaths: sparseKeywords =>
        getAmountMaths(instanceHandle, sparseKeywords),
      getOfferNotifier: offerHandle => offerTable.get(offerHandle).notifier,
      getOfferStatuses: offerHandles => {
        const { active, inactive } = offerTable.getOfferStatuses(offerHandles);
        assertOffersHaveInstanceHandle(active, instanceHandle);
        return harden({ active, inactive });
      },
      isOfferActive: offerHandle => {
        const isActive = offerTable.isOfferActive(offerHandle);
        // if offer isn't present, we do not want to throw.
        if (isActive) {
          assertOffersHaveInstanceHandle(harden([offerHandle]), instanceHandle);
        }
        return isActive;
      },
      getOffers: offerHandles => {
        assertOffersHaveInstanceHandle(offerHandles, instanceHandle);
        return offerTable.getOffers(offerHandles).map(removeAmountsAndNotifier);
      },
      getOffer: offerHandle => {
        assertOffersHaveInstanceHandle(harden([offerHandle]), instanceHandle);
        return removeAmountsAndNotifier(offerTable.get(offerHandle));
      },
      getCurrentAllocation: (offerHandle, sparseKeywords) => {
        assertOffersHaveInstanceHandle(harden([offerHandle]), instanceHandle);
        return doGetCurrentAllocation(
          instanceHandle,
          offerHandle,
          sparseKeywords,
        );
      },
      getCurrentAllocations: (offerHandles, sparseKeywords) => {
        assertOffersHaveInstanceHandle(offerHandles, instanceHandle);
        return offerHandles.map(offerHandle =>
          contractFacet.getCurrentAllocation(offerHandle, sparseKeywords),
        );
      },
      getInstanceRecord: () => instanceTable.get(instanceHandle),
      getIssuerRecord: issuer => removePurse(issuerTable.get(issuer)),
    });
    return contractFacet;
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
  const zoeService = harden(
    /**
     * @param {any} code
     */
    {
      getInviteIssuer: () => inviteIssuer,

      /**
       * Create an installation by safely evaluating the code and
       * registering it with Zoe. We have a moduleFormat to allow for
       * different future formats without silent failures.
       */
      install: (code, moduleFormat = 'nestedEvaluate') => {
        let installation;
        switch (moduleFormat) {
          case 'nestedEvaluate':
          case 'getExport': {
            installation = evalContractCode(code, additionalEndowments);
            break;
          }
          default: {
            assert.fail(
              details`Unimplemented installation moduleFormat ${moduleFormat}`,
            );
          }
        }
        const installationHandle = installationTable.create(
          harden({ installation, code }),
        );
        return installationHandle;
      },

      /**
       * Makes a contract instance from an installation and returns a
       * unique handle for the instance that can be shared, as well as
       * other information, such as the terms used in the instance.
       * @param  {object} installationHandle - the unique handle for the
       * installation
       * @param  {object} issuerKeywordRecord - optional, a record mapping keyword keys to
       * issuer values
       * @param  {object} terms - optional, arguments to the contract. These
       * arguments depend on the contract.
       */
      makeInstance: (
        installationHandle,
        issuerKeywordRecord = harden({}),
        terms = harden({}),
      ) => {
        const { installation } = installationTable.get(installationHandle);
        const instanceHandle = harden({});
        const contractFacet = makeContractFacet(instanceHandle);

        const cleanedKeywords = cleanKeywords(issuerKeywordRecord);
        const issuersP = cleanedKeywords.map(
          keyword => issuerKeywordRecord[keyword],
        );

        const makeInstanceRecord = issuerRecords => {
          const issuers = issuerRecords.map(record => record.issuer);
          const cleanedIssuerKeywordRecord = arrayToObj(
            issuers,
            cleanedKeywords,
          );
          const instanceRecord = harden({
            installationHandle,
            publicAPI: undefined,
            terms,
            issuerKeywordRecord: cleanedIssuerKeywordRecord,
          });

          instanceTable.create(instanceRecord, instanceHandle);
          return Promise.resolve()
            .then(_ => installation.makeContract(contractFacet))
            .then(({ invite, publicAPI }) => {
              // Once the contract is made, we add the publicAPI to the
              // contractRecord
              instanceTable.update(instanceHandle, { publicAPI });
              return inviteIssuer.isLive(invite).then(success => {
                assert(
                  success,
                  details`invites must be issued by the inviteIssuer.`,
                );
                return invite;
              });
            });
        };

        // The issuers may not have been seen before, so we must wait for
        // the issuer records to be available synchronously
        return issuerTable
          .getPromiseForIssuerRecords(issuersP)
          .then(makeInstanceRecord);
      },
      /**
       * Credibly retrieves an instance record given an instanceHandle.
       * @param {object} instanceHandle - the unique, unforgeable
       * identifier (empty object) for the instance
       */
      getInstanceRecord: instanceTable.get,

      /**
       * @deprecated renamed to getInstanceRecord
       * Credibly retrieves an instance record given an instanceHandle.
       * @param {object} instanceHandle - the unique, unforgeable
       * identifier (empty object) for the instance
       */
      getInstance: instanceTable.get,

      /** Get a notifier (see @agoric/notify) for the offer. */
      getOfferNotifier: offerHandle => offerTable.get(offerHandle).notifier,

      /**
       * Redeem the invite to receive a payout promise and an
       * outcome promise.
       * @param {Invite} invite - an invite (ERTP payment) to join a
       * Zoe smart contract instance
       * @param  {object?} proposal - the proposal, a record
       * with properties `want`, `give`, and `exit`. The keys of
       * `want` and `give` are keywords and the values are amounts.
       * @param  {object?} paymentKeywordRecord - a record with keyword
       * keys and values which are payments that will be escrowed by Zoe.
       *
       * The default arguments are so that remote invocations don't
       * have to specify empty objects (which get marshaled as presences).
       */
      offer: (
        invite,
        proposal = harden({}),
        paymentKeywordRecord = harden({}),
      ) => {
        return inviteIssuer.burn(invite).then(inviteAmount => {
          assert(
            inviteAmount.extent.length === 1,
            'only one invite should be redeemed',
          );

          const {
            extent: [{ instanceHandle, handle: inviteHandle }],
          } = inviteAmount;
          const { issuerKeywordRecord } = instanceTable.get(instanceHandle);
          const offerHandle = harden({});

          const amountMathKeywordRecord = getAmountMaths(
            instanceHandle,
            getKeywords(issuerKeywordRecord),
          );

          proposal = cleanProposal(
            issuerKeywordRecord,
            amountMathKeywordRecord,
            proposal,
          );

          // Promise flow:
          // issuer -> purse -> deposit payment -> offerHook -> payout
          const giveKeywords = Object.getOwnPropertyNames(proposal.give);
          const wantKeywords = Object.getOwnPropertyNames(proposal.want);
          const userKeywords = harden([...giveKeywords, ...wantKeywords]);
          const paymentDepositedPs = userKeywords.map(keyword => {
            const issuer = issuerKeywordRecord[keyword];
            const issuerRecordP = issuerTable.getPromiseForIssuerRecord(issuer);
            return issuerRecordP.then(({ purse }) => {
              if (giveKeywords.includes(keyword)) {
                // We cannot trust the returned amount since it comes directly
                // from the remote issuer. So we use our cleaned proposal's
                // amount that should be the same.
                return E(purse)
                  .deposit(
                    paymentKeywordRecord[keyword],
                    proposal.give[keyword],
                  )
                  .then(_ => proposal.give[keyword]);
              }
              // If any other payments are included, they are ignored.
              return Promise.resolve(
                amountMathKeywordRecord[keyword].getEmpty(),
              );
            });
          });

          const recordOffer = amountsArray => {
            const notifierRec = produceNotifier();
            const offerImmutableRecord = {
              instanceHandle,
              proposal,
              currentAllocation: arrayToObj(amountsArray, userKeywords),
              notifier: notifierRec.notifier,
              updater: notifierRec.updater,
            };
            offerTable.create(offerImmutableRecord, offerHandle);
            payoutMap.init(offerHandle, producePromise());
          };

          // Create result to be returned. Depends on `exit`
          const makeOfferResult = _ => {
            const offerHook = inviteHandleToOfferHook.get(inviteHandle);
            // For now, the "remote" function call only works because
            // the function is local. It cannot yet be remote
            // in our system because functions are not yet passable.
            const outcomeP = E(offerHook)(offerHandle);
            const offerResult = {
              offerHandle: HandledPromise.resolve(offerHandle),
              payout: payoutMap.get(offerHandle).promise,
              outcome: outcomeP,
            };
            const { exit } = proposal;
            const [exitKind] = Object.getOwnPropertyNames(exit);
            // Automatically cancel on deadline.
            if (exitKind === 'afterDeadline') {
              E(exit.afterDeadline.timer).setWakeup(
                exit.afterDeadline.deadline,
                harden({
                  wake: () =>
                    completeOffers(instanceHandle, harden([offerHandle])),
                }),
              );
              // Add an object with a cancel method to offerResult in
              // order to cancel on demand.
            } else if (exitKind === 'onDemand') {
              const completeObj = {
                complete: () =>
                  completeOffers(instanceHandle, harden([offerHandle])),
              };
              offerResult.completeObj = completeObj;
              // The property "cancelObj" and method "cancel" are
              // deprecated and will be removed in a later version.
              // https://github.com/Agoric/agoric-sdk/issues/835
              const cancelObj = {
                cancel: () =>
                  completeOffers(instanceHandle, harden([offerHandle])),
              };
              offerResult.cancelObj = cancelObj;
            } else {
              assert(
                exitKind === 'waived',
                details`exit kind was not recognized: ${openDetail(exitKind)}`,
              );
            }

            // if the exitRule.kind is 'waived' the user has no
            // possibility of cancelling
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
      getCurrentAllocation: (offerHandle, sparseKeywords) => {
        const { instanceHandle } = offerTable.get(offerHandle);
        return doGetCurrentAllocation(
          instanceHandle,
          offerHandle,
          sparseKeywords,
        );
      },
      getCurrentAllocations: (offerHandles, sparseKeywords) => {
        return offerHandles.map(offerHandle =>
          zoeService.getCurrentAllocation(offerHandle, sparseKeywords),
        );
      },
      getInstallation: installationHandle =>
        installationTable.get(installationHandle).code,
    },
  );
  return zoeService;
};

export { makeZoe };
