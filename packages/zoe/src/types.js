// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @template {string} H - the name of the handle
 * @typedef {H & {}} Handle A type constructor for an opaque type identified by the H string.
 * This uses an intersection type ('MyHandle' & {}) to tag the handle's type even though the
 * actual value is just an empty object.
 */

/**
 * @typedef {string} Keyword
 * @typedef {Handle<'InstallationHandle'>} InstallationHandle - an opaque handle for an bundle installation
 * @typedef {Handle<'InstanceHandle'>} InstanceHandle - an opaque handle for a contract instance
 * @typedef {Handle<'OfferHandle'>} OfferHandle - an opaque handle for an offer
 * @typedef {Handle<'InviteHandle'>} InviteHandle - an opaque handle for an invite
 * @typedef {Record<Keyword,Issuer>} IssuerKeywordRecord
 * @typedef {Record<Keyword,Brand>} BrandKeywordRecord
 * @typedef {Record<Keyword,Payment>} PaymentKeywordRecord
 * @typedef {Record<Keyword,Promise<Payment>>} PaymentPKeywordRecord
 * @typedef {Object} SourceBundle Opaque type for a JSONable source bundle
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
 * @property {(bundle: SourceBundle) => Promise<InstallationHandle>} install
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installationHandle.
 *
 * @property {<OC>(installationHandle: InstallationHandle,
 *             issuerKeywordRecord: IssuerKeywordRecord,
 *             terms?: object)
 *            => Promise<MakeInstanceResult<OC>>} makeInstance
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
 * @property {(instanceHandle: InstanceHandle) => InstanceRecord} getInstanceRecord
 * Credibly get information about the instance (such as the installation
 * and terms used).
 *
 * @property {<OC>(invite: Invite<OC>|PromiseLike<Invite<OC>>,
 *             proposal?: Proposal,
 *             paymentKeywordRecord?: PaymentKeywordRecord)
 *            => Promise<OfferResultRecord<OC>>} offer
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
 * @property {(offerHandle: OfferHandle) => Notifier<Allocation|undefined>} getOfferNotifier
 * Get a notifier (see `@agoric/notify`) for the offer's reallocations.
 * @property {(offerHandle: OfferHandle, brandKeywordRecord?: BrandKeywordRecords) => Allocation} getCurrentAllocation
 * @property {(offerHandles: OfferHandle[], brandKeywordRecord[]?: BrandKeywordRecords) => Allocation[]} getCurrentAllocations
 * @property {(installationHandle: InstallationHandle) => SourceBundle} getInstallation
 * Get the source code for the installed contract. Throws an error if the
 * installationHandle is not found.
 *
 * @typedef {Object} CompleteObj
 * @property {() => void} complete attempt to exit the contract and return a refund
 */

/**
 * @template OC - the offer outcome
 * @typedef {Object} OfferResultRecord This is returned by a call to `offer` on Zoe.
 * @property {Promise<OfferHandle>} offerHandle
 * @property {Promise<PaymentPKeywordRecord>} payout A promise that resolves
 * to a record which has keywords as keys and promises for payments
 * as values. Note that while the payout promise resolves when an offer
 * is completed, the promise for each payment resolves after the remote
 * issuer successfully withdraws the payment.
 *
 * @property {Promise<OC>} outcome Note that if the offerHook throws,
 * this outcome Promise will reject, but the rest of the OfferResultRecord is
 * still meaningful.
 *
 * @property {CompleteObj} [completeObj]
 * completeObj will only be present if exitKind was 'onDemand'
 */

/**
 * @typedef {Partial<ProposalRecord>} Proposal
 * @typedef {{give:AmountKeywordRecord,want:AmountKeywordRecord,exit:ExitRule}} ProposalRecord
 *
 * @typedef {Record<Keyword,Amount>} AmountKeywordRecord
 *
 * The keys are keywords, and the values are amounts. For example:
 * { Asset: amountMath.make(5), Price: amountMath.make(9) }
 *
 * @typedef {AmountKeywordRecord[]} AmountKeywordRecords
 */

/**
 * @template OC - the offer outcome
 * @typedef {Object} MakeInstanceResult
 * @property {Invite<OC>} invite
 * @property {InstanceRecord} instanceRecord
 */

/**
 * @typedef {Object} Waker
 * @property {() => void} wake
 *
 * @typedef {Object} Timer
 * @property {(deadline: Deadline, wakerP: ERef<Waker>) => void} setWakeup
 *
 * @typedef {number} Deadline
 *
 * @typedef {{waived:null}} Waived
 * @typedef {{onDemand:null}} OnDemand
 *
 * @typedef {{afterDeadline:{timer:Timer, deadline:Deadline}}} AfterDeadline
 *
 * @typedef {Partial<Waived>&Partial<OnDemand>&Partial<AfterDeadline>} ExitRule
 * The possible keys are 'waived', 'onDemand', and 'afterDeadline'.
 * `timer` and `deadline` only are used for the `afterDeadline` key.
 * The possible records are:
 * `{ waived: null }`
 * `{ onDemand: null }`
 * `{ afterDeadline: { timer :Timer<Deadline>, deadline :Deadline } }
 */

/**
 * @template OC - the offer outcome
 * @typedef {Payment & { _inviteOutcome: OC }} Invite
 * An invitation to participate in a Zoe contract.
 * Invites are Payments, so they can be transferred, stored in Purses, and
 * verified. Only Zoe can create new Invites.
 */

/**
 * @template OC - the offer outcome
 * @callback MakeContract The type exported from a Zoe contract
 * @param {ContractFacet} zcf The Zoe Contract Facet
 * @returns {Invite<OC>} invite The closely-held administrative invite
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
 * @property {InitPublicAPI} initPublicAPI
 * @property {() => ZoeService} getZoeService
 * @property {() => Issuer} getInviteIssuer
 * @property {(offerHandles: OfferHandle[]) => OfferStatus} getOfferStatuses
 * @property {(offerHandle: OfferHandle) => boolean} isOfferActive
 * @property {(offerHandles: OfferHandle[]) => OfferRecord[]} getOffers
 * @property {(offerHandle: OfferHandle) => OfferRecord} getOffer
 * @property {(offerHandle: OfferHandle, brandKeywordRecord?: BrandKeywordRecord) => Allocation} getCurrentAllocation
 * @property {(offerHandles: OfferHandle[], brandKeywordRecords?: BrandKeywordRecord[]) => Allocation[]} getCurrentAllocations
 * @property {(offerHandle: OfferHandle) => Promise<Notifier<Allocation|undefined>>} getOfferNotifier
 * @property {() => InstanceRecord} getInstanceRecord
 * @property {(issuer: Issuer) => Brand} getBrandForIssuer
 * @property {(brand: Brand) => Issuer} getIssuerForBrand
 * @property {(brand: Brand) => AmountMath} getAmountMath
 * @property {() => VatAdmin} getVatAdmin
 *
 * @callback Reallocate
 * The contract can propose a reallocation of extents across offers
 * by providing two parallel arrays: offerHandles and newAllocations.
 * Each element of newAllocations is an AmountKeywordRecord whose
 * amount should replace the old amount for that keyword for the
 * corresponding offer.
 *
 * The reallocation will only succeed if the reallocation 1) conserves
 * rights (the amounts specified have the same total value as the
 * current total amount), and 2) is 'offer-safe' for all parties involved.
 *
 * The reallocation is partial, meaning that it applies only to the
 * amount associated with the offerHandles that are passed in. By
 * induction, if rights conservation and offer safety hold before,
 * they will hold after a safe reallocation, even though we only
 * re-validate for the offers whose allocations will change. Since
 * rights are conserved for the change, overall rights will be unchanged,
 * and a reallocation can only effect offer safety for offers whose
 * allocations change.
 *
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
 * @returns {void}
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
 */

/**
 * @template OC - the offer outcome
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
 * @param {OfferHook<OC>} offerHook - a function that will be handed the
 * offerHandle at the right time, and returns a contract-specific
 * OfferOutcome which will be put in the OfferResultRecord.
 * @param {string} inviteDesc
 * @param {MakeInvitationOptions} [options]
 * @returns {Promise<Invite<OC>>}
 */

/**
 * @typedef MakeInvitationOptions
 * @property {CustomProperties} [customProperties] - an object of
 * information to include in the extent, as defined by the smart
 * contract
 */

/**
 * @template OC - the outcome type
 * @callback OfferHook
 * This function will be called with the OfferHandle when the offer
 * is prepared. It should return a contract-specific "OfferOutcome"
 * value that will be put in the OfferResultRecord.
 * @param {OfferHandle} offerHandle
 * @returns {OC}
 */

/**
 * @callback AddNewIssuer
 * Informs Zoe about an issuer and returns a promise for acknowledging
 * when the issuer is added and ready.
 * @param {ERef<Issuer>} issuerP Promise for issuer
 * @param {Keyword} keyword Keyword for added issuer
 * @returns {Promise<IssuerRecord>} Issuer is added and ready
 *
 * @typedef {Record<string,function>} PublicAPI
 *
 * @callback InitPublicAPI
 * Initialize the publicAPI for the contract instance, as stored by Zoe in
 * the instanceRecord.
 * @param {PublicAPI} publicAPI - an object whose methods are the API
 * available to anyone who knows the instanceHandle
 * @returns {void}
 */

/**
 * @typedef {Object} VatAdmin
 * A powerful object that can be used to terminate the vat in which a contract
 * is running, to get statistics, or to be notified when it terminates. The
 * VatAdmin object is only available to the contract from within the contract so
 * that clients of the contract can tell (by getting the source code from Zoe
 * using the instanceHandle) what use the contract makes of it. If they want to
 * be assured of discretion, or want to know that the contract doesn't have the
 * ability to call terminate(), Zoe makes this visible.
 *
 * @property {() => Object} done
 * provides a promise that will be fullfilled when the contract is terminated.
 * @property {() => undefined} terminate
 * kills the vat in which the contract is running
 * @property {() => Object} adminData
 * provides some statistics about the vat in which the contract is running.
 */

/**
 * @typedef {Object} CustomProperties
 *
 * @typedef {object} OfferRecord
 * @property {OfferHandle} handle - opaque identifier for the offer
 * @property {InstanceHandle} instanceHandle - opaque identifier for the instance
 * @property {ProposalRecord} proposal - the offer proposal (including want, give, exit)
 *
 * @typedef {object} InstanceRecord
 * @property {InstanceHandle} handle - opaque identifier for the instance
 * @property {InstallationHandle} installationHandle - opaque identifier for the installation
 * @property {Promise<PublicAPI>} publicAPI - the invite-free publicly accessible API for the contract
 * @property {Object} terms - contract parameters
 * @property {IssuerKeywordRecord} issuerKeywordRecord - record with keywords keys, issuer values
 * @property {BrandKeywordRecord} brandKeywordRecord - record with
 * keywords keys, brand values
 *
 * @typedef {Object} IssuerRecord
 * @property {Brand} brand
 * @property {Issuer} issuer
 * @property {AmountMath} amountMath
 *
 * @typedef {Object} InstallationRecord
 * @property {InstallationHandle} handle - opaque identifier for the installation
 * @property {SourceBundle} bundle - contract code
 *
 * @typedef {Object} OfferStatus
 * @property {OfferHandle[]} active
 * @property {OfferHandle[]} inactive
 *
 * @typedef {(offerHandle: OfferHandle) => void} OfferHook
 *
 * @typedef {Keyword[]} SparseKeywords
 * @typedef {{[Keyword:string]:Amount}} Allocation
 * @typedef {{[Keyword:string]:AmountMath}} AmountMathKeywordRecord
 */
