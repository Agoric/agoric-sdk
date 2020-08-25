// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @template {string} H - the name of the handle
 * @typedef {H & {}} Handle A type constructor for an opaque type
 * identified by the H string. This uses an intersection type
 * ('MyHandle' & {}) to tag the handle's type even though the actual
 * value is just an empty object.
 */

/**
 * @typedef {string} Keyword
 * @typedef {Handle<'InvitationHandle'>} InvitationHandle - an opaque handle for an invitation
 * @typedef {Record<Keyword,Issuer>} IssuerKeywordRecord
 * @typedef {Record<Keyword,Brand>} BrandKeywordRecord
 * @typedef {Record<Keyword,Payment>} PaymentKeywordRecord
 * @typedef {Record<Keyword,Promise<Payment>>} PaymentPKeywordRecord
 * @typedef {Object} SourceBundle Opaque type for a JSONable source bundle
 */

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
 * @property {() => Issuer} getInvitationIssuer
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
 * @property {(instance: Instance) => Object} getPublicFacet
 * @property {(instance: Instance) => IssuerKeywordRecord} getIssuers
 * @property {(instance: Instance) => BrandKeywordRecord} getBrands
 * @property {(instance: Instance) => Object} getTerms
 * @property {(invitation: Invitation) => Promise<Instance>} getInstance
 * @property {(invitation: Invitation) => Promise<Installation>} getInstallation
 * @property {(invitation: Invitation) => Promise<InvitationDetails>}
 * getInvitationDetails - return an object with the instance,
 * installation, description, invitation handle, and any custom properties
 * specific to the contract.
 *
 * @typedef {Object} InvitationDetails
 * @property {Installation} installation
 * @property {Instance} instance
 * @property {InvitationHandle} handle
 * @property {string} description
 */

/**
 * @typedef {Object} Installation
 * @property {() => SourceBundle} getBundle
 */

/**
 * @callback Install
 * @param {SourceBundle} bundle
 * @returns {Promise<Installation>}
 *
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installation.
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
 * @property {() => Promise<Notifier>} getNotifier
 *
 * @typedef {any} OfferResult
 */

/**
 * @callback Offer
 * @param {ERef<Invitation>} invitation
 * @param {Proposal=} proposal
 * @param {PaymentKeywordRecord=} paymentKeywordRecord
 * @returns {Promise<UserSeat>} seat
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
 * @typedef {Object} StartInstanceResult
 * @property {any} creatorFacet
 * @property {any} publicFacet
 * @property {Instance} instance
 * @property {Payment | undefined} creatorInvitation
 */

/**
 * @callback StartInstance
 * @param {Installation} installation
 * @param {IssuerKeywordRecord=} issuerKeywordRecord
 * @param {Object=} terms
 * @returns {Promise<StartInstanceResult>}
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
 */

/**
 * @typedef {Partial<ProposalRecord>} Proposal
 * @typedef {{give: AmountKeywordRecord,
 *            want: AmountKeywordRecord,
 *            exit: ExitRule
 *           }} ProposalRecord
 *
 * @typedef {Record<Keyword,Amount>} AmountKeywordRecord
 *
 * The keys are keywords, and the values are amounts. For example:
 * { Asset: amountMath.make(5), Price: amountMath.make(9) }
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
 * @typedef {Object} ContractFacet The Zoe interface specific to a
 * contract instance. The Zoe Contract Facet is an API object used by
 * running contract instances to access the Zoe state for that
 * instance. The Zoe Contract Facet is accessed synchronously from
 * within the contract, and usually is referred to in code as zcf.
 * @property {Reallocate} reallocate - reallocate amounts among seats
 * @property {(keyword: Keyword) => void} assertUniqueKeyword - check
 * whether a keyword is valid and unique and could be added in
 * `saveIssuer`
 * @property {SaveIssuer} saveIssuer - save an issuer to ZCF and Zoe
 * and get the amountMath and brand synchronously accessible after
 * saving
 * @property {MakeInvitation} makeInvitation
 * @property {Shutdown} shutdown
 * @property {() => ZoeService} getZoeService
 * @property {() => Issuer} getInvitationIssuer
 * @property {() => Terms } getTerms
 * @property {(issuer: Issuer) => Brand} getBrandForIssuer
 * @property {(brand: Brand) => Issuer} getIssuerForBrand
 * @property {GetAmountMath} getAmountMath
 * @property {MakeZCFMint} makeZCFMint
 * @property {() => ZcfSeatKit} makeEmptySeatKit
 */

/**
 * @callback MakeZCFMint
 * @param {Keyword} keyword
 * @param {AmountMathKind=} amountMathKind
 * @returns {Promise<ZCFMint>}
 */

/**
 * @typedef {Object} ZCFMint
 * @property {() => IssuerRecord} getIssuerRecord
 * @property {(gains: AmountKeywordRecord,
 *             zcfSeat?: ZCFSeat,
 *            ) => ZCFSeat} mintGains
 * All the amounts in gains must be of this ZCFMint's brand.
 * The gains' keywords are in the namespace of that seat.
 * Add the gains to that seat's allocation.
 * The resulting state must be offer safe. (Currently, increasing assets can
 * never violate offer safety anyway.)
 *
 * Mint that amount of assets into the pooled purse.
 * If a seat is provided, it is returned. Otherwise a new seat is
 * returned. TODO This creation-on-demand is not yet implemented.
 *
 * @property {(losses: AmountKeywordRecord,
 *             zcfSeat: ZCFSeat,
 *            ) => void} burnLosses
 * All the amounts in losses must be of this ZCFMint's brand.
 * The losses' keywords are in the namespace of that seat.
 * Subtract losses from that seat's allocation.
 * The resulting state must be offer safe.
 *
 * Burn that amount of assets from the pooled purse.
 */

/**
 * @callback Reallocate
 *
 * The contract can reallocate over seatStagings, which are
 * associations of seats with reallocations.
 *
 * The reallocation will only succeed if the reallocation 1) conserves
 * rights (the amounts specified have the same total value as the
 * current total amount), and 2) is 'offer-safe' for all parties
 * involved. Offer safety is checked at the staging step.
 *
 * The reallocation is partial, meaning that it applies only to the
 * seats associated with the seatStagings. By induction, if rights
 * conservation and offer safety hold before, they will hold after a
 * safe reallocation, even though we only re-validate for the seats
 * whose allocations will change. Since rights are conserved for the
 * change, overall rights will be unchanged, and a reallocation can
 * only effect offer safety for seats whose allocations change.
 *
 * @param  {SeatStaging} seatStaging
 * @param {SeatStaging} seatStaging
 * @param {SeatStaging=} seatStaging
 * @param {SeatStaging=} seatStaging
 * @param {SeatStaging=} seatStaging
 * @returns {void}
 */

/**
 * @callback MakeInvitation
 *
 * Make a credible Zoe invitation for a particular smart contract
 * indicated by the `instance` in the extent of the invitation. Zoe
 * also puts the `installation` and a unique `handle` in the extent of
 * the invitation. The contract must provide a `description` for the
 * invitation and should include whatever information is
 * necessary for a potential buyer of the invitation to know what they are
 * getting in the `customProperties`. `customProperties` will be
 * placed in the extent of the invitation.
 *
 * @param {OfferHandler} offerHandler - a contract specific function
 * that handles the offer, such as saving it or performing a trade
 * @param {string} description
 * @param {Object=} customProperties
 * @returns {Promise<Invitation>}
 */

/**
 * @callback SaveIssuer
 * Informs Zoe about an issuer and returns a promise for acknowledging
 * when the issuer is added and ready.
 * @param {ERef<Issuer>} issuerP Promise for issuer
 * @param {Keyword} keyword Keyword for added issuer
 * @returns {Promise<IssuerRecord>} Issuer is added and ready
 */

/**
 * @typedef RootAndAdminNode
 * @property {Object} root
 * @property {AdminNode} adminNode
 */

/**
 * @typedef {Object} VatAdminSvc
 * @property {(bundle: SourceBundle) => RootAndAdminNode} createVat
 * @property {(BundleName: string) => RootAndAdminNode} createVatByName
 */

/**
 * @typedef {Object} AdminNode
 * A powerful object that can be used to terminate the vat in which a contract
 * is running, to get statistics, or to be notified when it terminates. The
 * VatAdmin object is only available to the contract from within the contract so
 * that clients of the contract can tell (by getting the source code from Zoe
 * using the installation) what use the contract makes of it. If they want to
 * be assured of discretion, or want to know that the contract doesn't have the
 * ability to call terminate(), Zoe makes this visible.
 *
 * @property {() => Promise<void>} done
 * provides a promise that will be fulfilled when the contract is terminated.
 * @property {() => void} terminate
 * kills the vat in which the contract is running
 * @property {() => Object} adminData
 * provides some statistics about the vat in which the contract is running.
 */

/**
 * @typedef {Object} StandardTerms
 * @property {IssuerKeywordRecord} issuers - record with
 * keywords keys, issuer values
 * @property {BrandKeywordRecord} brands - record with keywords
 * keys, brand values
 * @property {AmountMathKeywordRecord} maths - record with keywords
 * keys, amountMath values
 *
 * @typedef {StandardTerms & Record<string, any>} Terms
 *
 * @typedef {object} InstanceRecord
 * @property {Installation} installation
 * @property {Terms} terms - contract parameters

 *
 * @typedef {Object} IssuerRecord
 * @property {Brand} brand
 * @property {Issuer} issuer
 * @property {AmountMath} amountMath
 *
 * @typedef {Record<Keyword,Amount>} Allocation
 * @typedef {Record<Keyword,AmountMath>} AmountMathKeywordRecord
 */

/**
 * @typedef {Object} ZCFSeat
 * @property {() => void} exit
 * @property {(reason?: any) => never} kickOut called with the reason this
 * seat is being kicked out, where reason is normally an instanceof Error.
 * @property {() => Notifier<Allocation>} getNotifier
 * @property {() => boolean} hasExited
 * @property {() => ProposalRecord} getProposal
 * @property {(keyword: Keyword, brand: Brand) => Amount} getAmountAllocated
 * The brand is used for filling in an empty amount if the `keyword`
 * is not present in the allocation
 * @property {() => Allocation} getCurrentAllocation
 * @property {(newAllocation: Allocation) => Boolean} isOfferSafe
 * @property {(newAllocation: Allocation) => SeatStaging} stage
 */

/**
 * @typedef {Object} SeatStaging
 * @property {() => ZCFSeat} getSeat
 * @property {() => Allocation} getStagedAllocation
 */

/**
 * @typedef {{ zcfSeat: ZCFSeat, userSeat: ERef<UserSeat>}} ZcfSeatKit
 */

/**
 * @callback OfferHandler
 * @param {ZCFSeat} seat
 * @returns any
 */

/**
 * @typedef {Object} ContractStartFnResult
 * @property {Object=} creatorFacet
 * @property {Promise<Invitation>=} creatorInvitation
 * @property {Object=} publicFacet
 */

/**
 * @callback ContractStartFn
 * @param {ContractFacet} zcf
 * @returns {ContractStartFnResult}
 */

/**
 * @typedef {Payment} Invitation
 */

/**
 * @typedef {Handle<'InstanceHandle'>} Instance
 */

/**
 * @callback GetAmountMath
 * @param {Brand} brand
 * @returns {AmountMath}
 */

/**
 * @callback Trade
 * Trade between left and right so that left and right end up with
 * the declared gains.
 * @param {ContractFacet} zcf
 * @param {SeatGainsLossesRecord} keepLeft
 * @param {SeatGainsLossesRecord} tryRight
 * @returns {void}
 *
 * @typedef {Object} SeatGainsLossesRecord
 * @property {ZCFSeat} seat
 * @property {AmountKeywordRecord} gains - what the offer will
 * gain as a result of this trade
 * @property {AmountKeywordRecord=} losses - what the offer will
 * give up as a result of this trade. Losses is optional, but can
 * only be omitted if the keywords for both offers are the same.
 * If losses is not defined, the gains of the other offer is
 * subtracted.
 */
