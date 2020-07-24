/**
 * @template K,V
 * @typedef {import('@agoric/store').Store<K, V>} Store
 */

/**
 * @template K,V
 * @typedef {import('@agoric/weak-store').WeakStore<K, V>} WeakStore
 */

/**
 * @template T
 * @typedef {import('@agoric/produce-promise').PromiseRecord<T>} PromiseRecord
 */

/**
 * @typedef {Object} ZcfForZoe
 * The facet ZCF presents to Zoe.
 *
 * @property {(offerHandle: OfferHandle, proposal: Proposal, allocation: Allocation) => (CompleteObj | undefined)} addOffer
 * Add a single offer to this contract instance.
 */

/**
 * @typedef {Object} ZoeForZcf
 * @property {<OC>(inviteCallback: InviteCallback<OC>, inviteDesc: string, options?: MakeInvitationOptions) => Invite<OC>} makeInvitation
 * @property {(offerHandles: OfferHandle[], reallocations: Allocation[]) => OfferHandle[]} updateAmounts
 * @property {(publicAPI: PublicAPI) => void} updatePublicAPI
 * @property {(issuerP: Issuer|PromiseLike<Issuer>, keyword: Keyword) => Promise<void>} addNewIssuer
 * @property {(offerHandles: OfferHandle[]) => void} completeOffers
 */

/**
 * @template OC - the offer outcome
 * @typedef {Object} InviteCallback<OC>
 * @property {OfferHook<OC>} invoke
 */

/**
 * @typedef StartContractParams
 * @property {ZoeService} zoeService - The canonical Zoe service in case the contract wants it
 * @property {SourceBundle} bundle an object containing source code and moduleFormat
 * @property {InstanceRecord} instanceData, fields for the instanceRecord
 * @property {ZoeForZcf} zoeForZcf - An inner facet of Zoe for the contractFacet's use
 * @property {Issuer} inviteIssuer, Zoe's inviteIssuer, for the contract to use
 *
 * @callback StartContract
 * Makes a contract instance from an installation and returns a
 * unique handle for the instance that can be shared, as well as
 * other information, such as the terms used in the instance.
 * @param {StartContractParams} params
 * @returns {Promise<{ inviteP: Promise<Invite>, zcfForZoe: ZcfForZoe }>}
 */

/**
 * @template T
 * @typedef {(record: any) => record is T} Validator
 */

/**
 * @template T
 * @typedef {Object} Table
 * @property {(record: any) => record is T} validate
 * @property {<H>(record: Omit<T, 'handle'>, handle: H = harden({})) => H} create
 * @property {(handle: any) => T} get
 * @property {(handle: any) => boolean} has
 * @property {(handle: any) => void} delete
 * @property {<H>(handle: H, partialRecord: Partial<T>) => H} update
 */

/**
 * @typedef {Object} PrivateInstanceRecord
 * @property {Promise<ZcfForZoe>} zcfForZoe - the inner facet for Zoe to use
 * @property {Set<OfferHandle>} offerHandles - the offer handles for this instance
 *
 * @typedef {Object} PrivateOfferRecord
 * @property {Allocation} currentAllocation - the allocation corresponding to this offer
 * @property {import('@agoric/notifier').Notifier<Allocation>=} notifier - the notifier for allocation changes
 * @property {import('@agoric/notifier').Updater<Allocation>} updater - the notifier for allocation changes
 */
