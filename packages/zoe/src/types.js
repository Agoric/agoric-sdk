// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {any} TODO Needs to be typed
 * @typedef {string} Keyword
 * @typedef {{}} InstallationHandle
 * @typedef {Object<string,Issuer>} IssuerKeywordRecord
 * @typedef {Object<string,Brand>} BrandKeywordRecord
 * @typedef {Object<string,Payment>} PaymentKeywordRecord
 * @typedef {Object<string,Promise<Payment>>} PaymentPKeywordRecord
 * @typedef {Object} SourceBundle
 * @property {string} source
 * @property {string} sourceMap
 * @property {string} moduleFormat
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
 * @property {(bundle: SourceBundle, moduleFormat?: string) => InstallationHandle} install
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
 * @property {(installationHandle: InstallationHandle) => SourceBundle} getInstallation
 * Get the source code for the installed contract. Throws an error if the
 * installationHandle is not found.
 *
 * @typedef {Object} CompleteObj
 * @property {() => void} complete attempt to exit the contract and return a refund
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
 * @property {CompleteObj} [completeObj]
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
 * @property {Promise<Invite>} invite
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
 * @property {InstanceHandle} instanceHandle - opaque identifier for the instance
 * @property {Proposal} proposal - the offer proposal (including want, give, exit)
 * @property {Allocation} currentAllocation - the allocation corresponding to this offer
 * @property {Notifier<any>} notifier - the notifier for XXX
 *
 * @typedef {object} InstanceRecord
 * @property {InstanceHandle} handle - opaque identifier for the instance, used as the table key
 * @property {InstallationHandle} installationHandle - opaque identifier for the installation
 * @property {Object.<string,function>} publicAPI - the invite-free publicly accessible API for the contract
 * @property {Object} terms - contract parameters
 * @property {IssuerKeywordRecord} issuerKeywordRecord - record with keywords keys, issuer values
 * @property {BrandKeywordRecord} brandKeywordRecord - record with
 * keywords keys, brand values
 * @property {Promise<ZcfInnerFacet>} zcfForZoe - the inner facet for Zoe to use
 * @property {OfferHandle[]} offerHandles - the offer handles for this instance
 *
 * @typedef {Object} IssuerRecord
 * @property {Brand} brand
 * @property {Issuer} issuer
 * @property {Purse} purse
 * @property {AmountMath} amountMath
 *
 * @typedef {Object} InstallationRecord
 * @property {InstallationHandle} handle - opaque identifier, used as the table key
 * @property {SourceBundle} bundle - contract code
 *
 * @typedef {Object} OfferStatus
 * @property {OfferHandle[]} active
 * @property {OfferHandle[]} inactive
 *
 * @typedef {Object} OfferHook
 * @property {(offerHandle: OfferHandle) => void} invoke
 *
 * @typedef {Keyword[]} SparseKeywords
 * @typedef {{[Keyword:string]:Amount}} Allocation
 * @typedef {{[Keyword:string]:AmountMath}} AmountMathKeywordRecord
 */

/**
 * @typedef {Object} ZcfInnerFacet
 * The facet ZCF presents to Zoe.
 *
 * @property {(OfferHandle, Proposal, Allocation) => (CompleteObj | undefined)} addOffer
 * Add a single offer to this contract instance.
 */

/**
 * @template T
 * @typedef {(record: any) => record is T} Validator
 */
