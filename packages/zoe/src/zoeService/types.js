// @jessie-check

/// <reference types="ses"/>

/**
 * @typedef {object} ZoeService
 *
 * Zoe provides a framework for deploying and working with smart
 * contracts. It is accessed as a long-lived and well-trusted service
 * that enforces offer safety for the contracts that use it. Zoe has a
 * single `invitationIssuer` for the entirety of its lifetime. By
 * having a reference to Zoe, a user can get the `invitationIssuer`
 * and thus validate any `invitation` they receive from someone else.
 *
 * Zoe has two different facets: the public Zoe service and the
 * contract facet (ZCF). Each contract instance has a copy of ZCF
 * within its vat. The contract and ZCF never have direct access to
 * the users' payments or the Zoe purses.
 *
 * @property {GetInvitationIssuer} getInvitationIssuer
 *
 * Zoe has a single `invitationIssuer` for the entirety of its
 * lifetime. By having a reference to Zoe, a user can get the
 * `invitationIssuer` and thus validate any `invitation` they receive
 * from someone else. The mint associated with the invitationIssuer
 * creates the ERTP payments that represent the right to interact with
 * a smart contract in particular ways.
 *
 * @property {InstallBundle} install
 * @property {InstallBundleID} installBundleID
 * @property {import('./utils.js').StartInstance} startInstance
 * @property {Offer} offer
 * @property {import('./utils.js').GetPublicFacet} getPublicFacet
 * @property {GetIssuers} getIssuers
 * @property {GetBrands} getBrands
 * @property {import('./utils.js').GetTerms} getTerms
 * @property {GetOfferFilter} getOfferFilter
 * @property {GetInstallationForInstance} getInstallationForInstance
 * @property {GetInstance} getInstance
 * @property {GetInstallation} getInstallation
 * @property {GetInvitationDetails} getInvitationDetails
 * Return an object with the instance, installation, description, invitation
 * handle, and any custom properties specific to the contract.
 * @property {GetFeeIssuer} getFeeIssuer
 * @property {GetConfiguration} getConfiguration
 * @property {GetBundleIDFromInstallation} getBundleIDFromInstallation
 * @property {(invitationHandle: InvitationHandle) => Pattern | undefined} getProposalShapeForInvitation
 */

/**
 * @callback GetInvitationIssuer
 * @returns {Promise<Issuer<'set'>>}
 */

/**
 * @callback GetFeeIssuer
 * @returns {Promise<Issuer<'nat'>>}
 */

/**
 * @callback GetConfiguration
 * @returns {{
 *   feeIssuerConfig: FeeIssuerConfig,
 * }}
 */

/**
 * @callback GetIssuers
 * @param {import('./utils.js').Instance<any>} instance
 * @returns {Promise<IssuerKeywordRecord>}
 */

/**
 * @callback GetBrands
 * @param {import('./utils.js').Instance<any>} instance
 * @returns {Promise<BrandKeywordRecord>}
 */

/**
 * @callback GetOfferFilter
 * @param {import('./utils.js').Instance<any>} instance
 * @returns {string[]}
 */

/**
 * @callback SetOfferFilter
 * @param {Instance} instance
 * @param {string[]} strings
 */

/**
 * @callback GetInstallationForInstance
 * @param {import('./utils.js').Instance<any>} instance
 * @returns {Promise<Installation>}
 */

/**
 * @callback GetInstance
 * @param {ERef<Invitation>} invitation
 * @returns {Promise<import('./utils.js').Instance<any>>}
 */

/**
 * @callback GetInstallation
 * @param {ERef<Invitation>} invitation
 * @returns {Promise<Installation>}
 */

/**
 * @callback GetInvitationDetails
 * @param {ERef<Invitation<any, any>>} invitation
 * @returns {Promise<InvitationDetails>}
 */

// TODO remove support for source bundles, leaving only support for hash bundles.
// https://github.com/Agoric/agoric-sdk/issues/4565
/**
 * @callback InstallBundle
 *
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installation.
 *
 * @param {Bundle | SourceBundle} bundle
 * @param {string} [bundleLabel]
 * @returns {Promise<Installation>}
 */

// TODO consolidate installBundleID into install.
// https://github.com/Agoric/agoric-sdk/issues/4974
/**
 * @callback InstallBundleID
 *
 * Create an installation from a Bundle ID. Returns an installation.
 *
 * @param {BundleID} bundleID
 * @param {string} [bundleLabel]
 * @returns {Promise<Installation>}
 */

/**
 * @callback GetBundleIDFromInstallation
 *
 * Verify that an alleged Installation is real, and return the Bundle ID it
 * will use for contract code.
 *
 * @param {ERef<Installation>} allegedInstallation
 * @returns {Promise<BundleID>}
 */

/**
 * @typedef {<Result, Args = undefined>(
 *   invitation: ERef<Invitation<Result, Args>>,
 *   proposal?: Proposal,
 *   paymentKeywordRecord?: PaymentPKeywordRecord,
 *   offerArgs?: Args,
 *   ) => Promise<UserSeat<Result>>
 * } Offer
 *
 * To redeem an invitation, the user normally provides a proposal (their
 * rules for the offer) as well as payments to be escrowed by Zoe.  If
 * either the proposal or payments would be empty, indicate this by
 * omitting that argument or passing undefined, rather than passing an
 * empty record.
 *
 * The proposal has three parts: `want` and `give` are used by Zoe to
 * enforce offer safety, and `exit` is used to specify the particular
 * payout-liveness policy that Zoe can guarantee. `want` and `give`
 * are objects with keywords as keys and amounts as values.
 * `paymentKeywordRecord` is a record with keywords as keys, and the
 * values are the actual payments to be escrowed. A payment is
 * expected for every rule under `give`.
 */

/**
 * Zoe uses seats to access or manipulate offers. They let contracts and users
 * interact with them. Zoe has two kinds of seats. ZCFSeats are used within
 * contracts and with zcf methods. UserSeats represent offers external to Zoe
 * and the contract. The party who exercises an invitation and sends the offer()
 * message to Zoe gets a UserSeat that can check payouts' status or retrieve the
 * result of processing the offer in the contract. This varies, but examples are
 * a string and an invitation for another seat.
 *
 * Also, a UserSeat can be handed to an agent outside Zoe and the contract,
 * letting them query or monitor the current state, access the payouts and
 * result, and, if it's allowed for this seat, call tryExit().
 *
 * Since anyone can attempt to exit the seat if they have a reference to it, you
 * should only share a UserSeat with trusted parties.
 *
 * UserSeat includes queries for the associated offer's current state and an
 * operation to request that the offer exit, as follows:
 *
 * @see {@link https://docs.agoric.com/zoe/api/zoe.html#userseat-object}}
 * @template {object} [OR=unknown]
 * @typedef {object} UserSeat
 * @property {() => Promise<ProposalRecord>} getProposal A _Proposal_ is
 * represented by a _ProposalRecord_. It is the rules accompanying the escrow of
 * Payments dictating what the user expects to get back from Zoe. It has keys
 * _give_, _want_, and _exit_. _give_ and _want_ are records with
 * {@link Keyword} as keys and {@link Amount} as values. If it is compatible
 * with the contract, the contract tries to satisfy it. If not, the contract
 * kicks the _seat_ out.
 *
 * Offer safety is always enforced; if kicked out, the user gets back what they
 * put in. If the contract attempts to satisfy it, they either get what they
 * asked for or Zoe ensures they get back their deposit.
 *
 * Example:
 *
 *     const { want, give, exit } = sellerSeat.getProposal();
 *
 * @property {() => Promise<PaymentPKeywordRecord>} getPayouts Returns a Promise
 * for a KeywordRecord containing Promises for all the Payouts associated with
 * the seat's offers. A Payout is a {@link Payment} that goes to a party in a
 * successful transaction, redirecting escrowed assets in accordance with the
 * result of the transaction.
 *
 * The promise will be resolved promptly once the seat exits.
 *
 * @property {(keyword: Keyword) => Promise<Payment<any>>} getPayout returns a
 * promise for the Payment corresponding to the indicated keyword. The promise
 * will resolve after the seat has exited.
 * @property {() => Promise<OR>} getOfferResult Returns a Promise for an
 * OfferResult. The OfferResult can be any Passable. For example, in the
 * Automatic Refund example, it's the string "The offer was accepted". In the
 * Covered Call example, it's a call option, which is an assayable Invitation to
 * buy the underlying asset. Strings and invitations are the most common things
 * returned. The value is the result returned by the offerHandler function
 * passed in the first argument to zcf.makeInvitation(...).
 * Since the contract can return whatever it wants as an offer result, there is no guarantee that the promise will resolve promptly.
 * @property {() => void} tryExit Note: Only works if the seat's `proposal`
 * has an `OnDemand` `exit` clause. Zoe's offer-safety guarantee applies no
 * matter how a seat's interaction with a contract ends. Under normal
 * circumstances, the participant might be able to call `tryExit()`, or the
 * contract might do something explicitly. On exiting, the seat holder gets its
 * current `allocation` and the `seat` can no longer interact with the contract.
 * @property {() => Promise<boolean>} hasExited Returns true if the seat has
 * exited, false if it is still active. Returns promptly.
 * @property {() => Promise<0|1>} numWantsSatisfied Returns a Promise for a
 * number which indicates the result of the exited Proposal, as described below:
 *
 * - 0: The user didn't get what they wanted from the Proposal, so their offer was refunded.
 * - 1: The user got what they wanted from the Proposal, so their offer is spent & gone.
 *
 * This promise will be resolved promptly once the seat exits.
 *
 * This is numeric to support a planned enhancement called "multiples" which
 * will allow the return value to be any non-negative number.
 * @property {() => Promise<Allocation>} getFinalAllocation return a promise for
 * the final allocation. The promise will be resolved promptly once the seat exits.
 * @property {() => Subscriber<Completion>} getExitSubscriber returns a
 * subscriber that will be notified when the seat has exited or failed.
 */

/**
 * @typedef {Partial<ProposalRecord>} Proposal
 *
 * @typedef {{give: AmountKeywordRecord,
 *            want: AmountKeywordRecord,
 *            exit: ExitRule
 *           }} ProposalRecord
 */

/**
 * @typedef {Record<Keyword, Amount<any>>} AmountKeywordRecord
 *
 * The keys are keywords, and the values are amounts. For example:
 * { Asset: AmountMath.make(assetBrand, 5n), Price:
 * AmountMath.make(priceBrand, 9n) }
 */

/**
 * @typedef {object} Waker
 * @property {() => void} wake
 */

/**
 * @typedef {object} OnDemandExitRule
 * @property {null} onDemand
 */

/**
 * @typedef {object} WaivedExitRule
 * @property {null} waived
 */

/**
 * @typedef {object} AfterDeadlineExitRule
 * @property {{timer: import('@agoric/time').TimerService, deadline: import('@agoric/time').Timestamp}} afterDeadline
 */

/**
 * @typedef {OnDemandExitRule | WaivedExitRule | AfterDeadlineExitRule} ExitRule
 *
 * The possible keys are 'waived', 'onDemand', and 'afterDeadline'.
 * `timer` and `deadline` only are used for the `afterDeadline` key.
 * The possible records are:
 * `{ waived: null }`
 * `{ onDemand: null }`
 * `{ afterDeadline: { timer :Timer<Deadline>, deadline :Deadline } }`
 */

/**
 * @typedef {import('./utils.js').Instance<any>} Instance
 */

/**
 * @import {VatAdminSvc} from '@agoric/swingset-vat'
 */

/**
 * @typedef {{bundleCap: import('@agoric/swingset-vat').BundleCap } | {name: string} | {id: BundleID}} ZCFSpec
 */

/**
 * @typedef {Record<string, any>} SourceBundle
 * Opaque type for a JSONable source bundle
 */

/**
 * @typedef {Record<Keyword,ERef<Payment<any>>>} PaymentPKeywordRecord
 * @typedef {Record<Keyword,Payment<any>>} PaymentKeywordRecord
 */

/**
 * @typedef {object} InvitationDetails
 * @property {Installation} installation
 * @property {import('./utils.js').Instance<any>} instance
 * @property {InvitationHandle} handle
 * @property {string} description
 * @property {Record<string, any>} [customDetails]
 */

/**
 * @template [SF=any] contract start function
 * @typedef {import('./utils.js').Installation<SF>} Installation
 */

/**
 * @template {Installation} I
 * @typedef {import('./utils.js').InstallationStart<I>} InstallationStart
 */

/**
 * @typedef {object} FeeIssuerConfig
 * @property {string} name
 * @property {AssetKind} assetKind
 * @property {DisplayInfo} displayInfo
 */

/**
 * @typedef {object} ZoeFeesConfig
 * @property {NatValue} getPublicFacetFee
 */

/**
 * @typedef {Handle<'feeMintAccess'>} FeeMintAccess
 */
