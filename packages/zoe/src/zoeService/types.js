// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {Object} ZoeService
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
 * @property {Install} install
 * @property {StartInstance} startInstance
 * @property {Offer} offer
 * @property {GetPublicFacet} getPublicFacet
 * @property {GetIssuers} getIssuers
 * @property {GetBrands} getBrands
 * @property {GetTerms} getTerms
 * @property {GetInstallationForInstance} getInstallationForInstance
 * @property {GetInstance} getInstance
 * @property {GetInstallation} getInstallation
 * @property {GetInvitationDetails} getInvitationDetails - return an
 * object with the instance, installation, description, invitation
 * handle, and any custom properties specific to the contract.
 * @property {GetFeeIssuer} getFeeIssuer
 * @property {MakeFeePurse} makeFeePurse
 * @property {BindDefaultFeePurse} bindDefaultFeePurse
 */

/**
 * @callback GetInvitationIssuer
 * @returns {Promise<Issuer>}
 */

/**
 * @callback GetFeeIssuer
 * @returns {Promise<Issuer>}
 */

/**
 * @typedef {Purse} FeePurse
 */

/**
 * @callback MakeFeePurse
 * @returns {Promise<FeePurse>}
 */

/**
 * @callback BindDefaultFeePurse
 * @param {ERef<FeePurse>} defaultFeePurse
 * @returns {ZoeService}
 */

/**
 * @callback GetPublicFacet
 * @param {Instance} instance
 * @param {ERef<FeePurse>=} feePurse
 * @returns {Promise<Object>}
 */

/**
 * @callback GetPublicFacetFeePurseRequired
 * @param {Instance} instance
 * @param {ERef<FeePurse>} feePurse
 * @returns {Promise<Object>}
 */

/**
 * @callback GetIssuers
 * @param {Instance} instance
 * @returns {Promise<IssuerKeywordRecord>}
 */

/**
 * @callback GetBrands
 * @param {Instance} instance
 * @returns {Promise<BrandKeywordRecord>}
 */

/**
 * @callback GetTerms
 * @param {Instance} instance
 * @returns {Promise<Terms>}
 */

/**
 * @callback GetInstallationForInstance
 * @param {Instance} instance
 * @returns {Promise<Installation>}
 */

/**
 * @callback GetInstance
 * @param {ERef<Invitation>} invitation
 * @returns {Promise<Instance>}
 */

/**
 * @callback GetInstallation
 * @param {ERef<Invitation>} invitation
 * @returns {Promise<Installation>}
 */

/**
 * @callback GetInvitationDetails
 * @param {ERef<Invitation>} invitation
 * @returns {Promise<InvitationDetails>}
 */

/**
 * @callback Install
 *
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installation.
 *
 * @param {SourceBundle} bundle
 * @param {ERef<FeePurse>=} feePurse
 * @returns {Promise<Installation>}
 */

/**
 * @callback InstallFeePurseRequired
 *
 * See Install for comments.
 *
 * @param {SourceBundle} bundle
 * @param {ERef<FeePurse>} feePurse
 * @returns {Promise<Installation>}
 */

/**
 * @callback StartInstance
 *
 * Zoe is long-lived. We can use Zoe to create smart contract
 * instances by specifying a particular contract installation to use,
 * as well as the `terms` of the contract. The `terms.issuers` is a
 * record mapping string names (keywords) to issuers, such as `{
 * Asset: simoleanIssuer}`. (Note that the keywords must begin with a
 * capital letter and must be ASCII identifiers.) Parties to the
 * contract will use the keywords to index their proposal and their
 * payments.
 *
 * The custom terms are the arguments to the contract, such as the
 * number of bids an auction will wait for before closing. Custom
 * terms are up to the discretion of the smart contract. We get back
 * the creator facet, public facet, and creator invitation as defined
 * by the contract.
 *
 * @param {ERef<Installation>} installation
 * @param {IssuerKeywordRecord=} issuerKeywordRecord
 * @param {Object=} terms
 * @param {Object=} privateArgs - an optional configuration object
 * that can be used to pass in arguments that should not be in the
 * public terms
 * @param {ERef<FeePurse>=} feePurse
 * @returns {Promise<StartInstanceResult>}
 */

/**
 * @callback StartInstanceFeePurseRequired
 *
 * See StartInstance for comments.
 *
 * @param {ERef<Installation>} installation
 * @param {IssuerKeywordRecord=} issuerKeywordRecord
 * @param {Object=} terms
 * @param {Object=} privateArgs
 * @param {ERef<FeePurse>} feePurse
 * @returns {Promise<StartInstanceResult>}
 */

/**
 * @callback Offer
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
 *
 * @param {ERef<Invitation>} invitation
 * @param {Proposal=} proposal
 * @param {PaymentPKeywordRecord=} paymentKeywordRecord
 * @param {Object=} offerArgs
 * @param {ERef<FeePurse>=} feePurse
 * @returns {Promise<UserSeat>} seat
 */

/**
 * @callback OfferFeePurseRequired
 *
 * See Offer for comments.
 *
 * @param {ERef<Invitation>} invitation
 * @param {Proposal=} proposal
 * @param {PaymentPKeywordRecord=} paymentKeywordRecord
 * @param {Object=} offerArgs
 * @param {ERef<FeePurse>} feePurse
 * @returns {Promise<UserSeat>} seat
 */

/**
 * @typedef {Object} UserSeat
 * @property {() => Promise<Allocation>} getCurrentAllocation
 * @property {() => Promise<ProposalRecord>} getProposal
 * @property {() => Promise<PaymentPKeywordRecord>} getPayouts
 * @property {(keyword: Keyword) => Promise<Payment>} getPayout
 * @property {() => Promise<OfferResult>} getOfferResult
 * @property {() => void=} tryExit
 * @property {() => Promise<boolean>} hasExited
 * @property {() => Promise<Notifier<Allocation>>} getNotifier
 */

/**
 * @typedef {any} OfferResult
 */

/**
 * @typedef {Object} AdminFacet
 * @property {() => Promise<Completion>} getVatShutdownPromise
 */

/**
 * @typedef {Object} StartInstanceResult
 * @property {any} creatorFacet
 * @property {any} publicFacet
 * @property {Instance} instance
 * @property {Payment | undefined} creatorInvitation
 * @property {AdminFacet} adminFacet
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
 * @typedef {Record<Keyword,Amount>} AmountKeywordRecord
 *
 * The keys are keywords, and the values are amounts. For example:
 * { Asset: AmountMath.make(5n, assetBrand), Price:
 * AmountMath.make(9n, priceBrand) }
 */

/**
 * @typedef {Object} Waker
 * @property {() => void} wake
 */

/**
 * @typedef {bigint} Deadline
 */

/**
 * @typedef {Object} Timer
 * @property {(deadline: Deadline, wakerP: ERef<Waker>) => void} setWakeup
 */

/**
 * @typedef {Object} OnDemandExitRule
 * @property {null} onDemand
 */

/**
 * @typedef {Object} WaivedExitRule
 * @property {null} waived
 */

/**
 * @typedef {Object} AfterDeadlineExitRule
 * @property {{timer:Timer, deadline:Deadline}} afterDeadline
 */

/**
 * @typedef {OnDemandExitRule | WaivedExitRule | AfterDeadlineExitRule} ExitRule
 *
 * The possible keys are 'waived', 'onDemand', and 'afterDeadline'.
 * `timer` and `deadline` only are used for the `afterDeadline` key.
 * The possible records are:
 * `{ waived: null }`
 * `{ onDemand: null }`
 * `{ afterDeadline: { timer :Timer<Deadline>, deadline :Deadline } }
 */

/**
 * @typedef {Handle<'Instance'>} Instance
 */

/**
 * @typedef {Object} VatAdminSvc
 * @property {(bundle: SourceBundle) => RootAndAdminNode} createVat
 * @property {(BundleName: string) => RootAndAdminNode} createVatByName
 */

/**
 * @typedef {Record<string, any>} SourceBundle Opaque type for a JSONable source bundle
 */

/**
 * @typedef {Record<Keyword,ERef<Payment>>} PaymentPKeywordRecord
 * @typedef {Record<Keyword,Payment>} PaymentKeywordRecord
 */

/**
 * @typedef {Object} StandardInvitationDetails
 * @property {Installation} installation
 * @property {Instance} instance
 * @property {InvitationHandle} handle
 * @property {string} description
 */

/**
 * @typedef {StandardInvitationDetails & Record<string, any>} InvitationDetails
 */

/**
 * @typedef {Object} Installation
 * @property {() => SourceBundle} getBundle
 */

/**
 * @typedef {Object} FeeIssuerConfig
 * @property {string} name
 * @property {AssetKind} assetKind
 * @property {DisplayInfo} displayInfo
 * @property {Value} initialFunds
 */

/**
 * @typedef {Object} ZoeServiceFeePurseRequired
 *
 * See ZoeService for further comments and explanation (not copied here).
 *
 * @property {GetInvitationIssuer} getInvitationIssuer
 * @property {InstallFeePurseRequired} install
 * @property {StartInstanceFeePurseRequired} startInstance
 * @property {OfferFeePurseRequired} offer
 * @property {GetPublicFacetFeePurseRequired} getPublicFacet
 * @property {GetIssuers} getIssuers
 * @property {GetBrands} getBrands
 * @property {GetTerms} getTerms
 * @property {GetInstallationForInstance} getInstallationForInstance
 * @property {GetInstance} getInstance
 * @property {GetInstallation} getInstallation
 * @property {GetInvitationDetails} getInvitationDetails
 * @property {GetFeeIssuer} getFeeIssuer
 * @property {MakeFeePurse} makeFeePurse
 * @property {BindDefaultFeePurse} bindDefaultFeePurse
 */

/**
 * @typedef {Object} ZoeFeesConfig
 * @property {NatValue} getPublicFacetFee
 * @property {NatValue} installFee
 * @property {NatValue} startInstanceFee
 * @property {NatValue} offerFee
 */

/**
 * @typedef {Object} MeteringConfig
 * @property {bigint} initial - the amount of computrons a meter
 * starts with
 * @property {bigint} incrementBy - when a meter is refilled, this
 * amount will be added
 * @property {bigint} threshold - Zoe will be notified when the meter
 * drops below this amount
 * @property {{ feeNumerator: bigint, computronDenominator: bigint }}
 * price - the price of computrons in RUN
 */
