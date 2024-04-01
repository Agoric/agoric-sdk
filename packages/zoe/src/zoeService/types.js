// @jessie-check

/// <reference types="ses"/>
/**
 * @import { Installation, InstallationStart, Instance } from './utils.js'
 * @import {VatAdminSvc} from '@agoric/swingset-vat'
 */

// @@@
// * TODO remove support for source bundles, leaving only support for hash bundles.
// * {@link https://github.com/Agoric/agoric-sdk/issues/4565}
// TODO consolidate installBundleID into install.
// https://github.com/Agoric/agoric-sdk/issues/4974

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
 * @property {() => Promise<Issuer<'set'>>} getInvitationIssuer
 *
 * Zoe has a single `invitationIssuer` for the entirety of its
 * lifetime. By having a reference to Zoe, a user can get the
 * `invitationIssuer` and thus validate any `invitation` they receive
 * from someone else. The mint associated with the invitationIssuer
 * creates the ERTP payments that represent the right to interact with
 * a smart contract in particular ways.
 *
 * @property {(bundle: Bundle | SourceBundle, bundleLabel?: string) => Promise<Installation>} install
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installation.
 *
 * @property {(bundleID: BundleID, bundleLabel?: string) => Promise<Installation>} installBundleID
 * Create an installation from a Bundle ID. Returns an installation.
 *
 * @property {import('./utils.js').StartInstance} startInstance
 *
 * @property {<Result, Args = undefined>(
 *   invitation: ERef<Invitation<Result, Args>>,
 *   proposal?: Proposal,
 *   paymentKeywordRecord?: PaymentPKeywordRecord,
 *   offerArgs?: Args,
 *   ) => Promise<UserSeat<Result>>} offer
 * @property {import('./utils.js').GetPublicFacet} getPublicFacet
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
 *
 * @property {(instance: Instance<any>) => Promise<IssuerKeywordRecord>} getIssuers
 *
 * @property {(instance: Instance) => Promise<BrandKeywordRecord>} getBrands
 * Get the current mapping of keywords to brands, as from {@link getTerms}
 *
 * @property {<SF>(instance: Instance<SF>) => Promise<StandardTerms & import('./utils').StartParams<SF>["terms"]>} getTerms
 * Each Zoe contract instance has an customTerms, issuers,
 * and brands. The customTerms are never changed, but new issuers (and their
 * matching brands) may be added by the contract code.
 *
 * @property {(instance: Instance<any>) => string[]} getOfferFilter
 *
 * @property {(instance: Instance<any>) => Promise<Installation>} getInstallationForInstance
 *
 * @property {(invitation: ERef<Invitation>) => Promise<Instance<any>>} getInstance
 *
 * @property {(invitation: ERef<Invitation>) => Promise<Installation>} getInstallation
 *
 * @property {(invitation: ERef<Invitation<any, any>>) => Promise<InvitationDetails>} getInvitationDetails
 *
 * Return an object with the instance, installation, description, invitation
 * handle, and any custom properties specific to the contract.
 * @property {() => Promise<Issuer<'nat'>>} getFeeIssuer
 *
 * @property {() => {
 *   feeIssuerConfig: FeeIssuerConfig,
 * }} getConfiguration
 *
 * Verify that an alleged Installation is real, and return the Bundle ID it
 * will use for contract code.
 * @property {(allegedInstallation: ERef<Installation>) => Promise<BundleID>} getBundleIDFromInstallation
 *
 * @property {(invitationHandle: InvitationHandle) => Pattern | undefined} getProposalShapeForInvitation
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
 * @property {() => Promise<ProposalRecord>} getProposal
 * @property {() => Promise<PaymentPKeywordRecord>} getPayouts
 * returns a promise for a KeywordPaymentRecord containing all the payouts from
 * this seat. The promise will resolve after the seat has exited.
 * @property {(keyword: Keyword) => Promise<Payment<any>>} getPayout
 * returns a promise for the Payment corresponding to the indicated keyword.
 * The promise will resolve after the seat has exited.
 * @property {() => Promise<OR>} getOfferResult
 * @property {() => void} [tryExit]
 * Note: Only works if the seat's `proposal` has an `OnDemand` `exit` clause. Zoe's
 * offer-safety guarantee applies no matter how a seat's interaction with a
 * contract ends. Under normal circumstances, the participant might be able to
 * call `tryExit()`, or the contract might do something explicitly. On exiting,
 * the seat holder gets its current `allocation` and the `seat` can no longer
 * interact with the contract.
 * @property {() => Promise<boolean>} hasExited
 * Returns true if the seat has exited, false if it is still active.
 * @property {() => Promise<0|1>} numWantsSatisfied returns 1 if the proposal's
 * want clause was satisfied by the final allocation, otherwise 0. This is
 * numeric to support a planned enhancement called "multiples" which will allow
 * the return value to be any non-negative number. The promise will resolve
 * after the seat has exited.
 * @property {() => Promise<Allocation>} getFinalAllocation
 * return a promise for the final allocation. The promise will resolve after the
 * seat has exited.
 * @property {() => Subscriber<Completion>} getExitSubscriber returns a subscriber that
 * will be notified when the seat has exited or failed.
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
