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
 * @property {(inviteCallback: InviteCallback, inviteDesc: string, options?: MakeInvitationOptions) => Payment} makeInvitation
 * @property {(offerHandles: OfferHandle[], reallocations: Allocation[]) => OfferHandle[]} updateAmounts
 * @property {(publicAPI: PublicAPI) => InstanceHandle} updatePublicAPI
 * @property {(issuerP: Issuer|PromiseLike<Issuer>, keyword: Keyword) => Promise<void>} addNewIssuer
 * @property {(offerHandles: OfferHandle[]) => void} completeOffers
 */

/**
 * @typedef {Object} InviteCallback
 * @property {OfferHook} invoke
 *
 * @callback StartContract
 * Makes a contract instance from an installation and returns a
 * unique handle for the instance that can be shared, as well as
 * other information, such as the terms used in the instance.
 * @param {ZoeService} zoeService - The canonical Zoe service in case the contract wants it
 * @param {Record<Keyword,Issuer>} issuerKeywordRecord - a record mapping
 * keyword keys to issuer values
 * @param {SourceBundle} bundle an object containing source code and moduleFormat
 * @param {Object} instanceData, fields for the instanceRecord
 * @param {ZoeForZcf} zoeForZcf - An inner facet of Zoe for the contractFacet's use
 * @param {Issuer} inviteIssuerIn, Zoe's inviteIssuer, for the contract to use
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
 * @property {<H>(record: T, handle: H = harden({})) => H} create
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
