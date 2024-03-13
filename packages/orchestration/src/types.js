// @ts-check
import '@agoric/vats/exported.js';
import '@agoric/zoe/exported.js';

export {};

/**
 * @typedef {object} Chain A fault-tolerant, consensus-based state machine.
 * @property {(codecs?: CodecRegistry) => Promise<
 *  { info: AccountInfo, agent: AccountAgent, authorizer: TxAuthorizer }
 * >} createAccount Create a fresh (unique) account on this chain, and return a
 * powerful authorizer that should be closely-held.  Also provide powerless
 * account metadata.
 * @property {(queryParams: TypedData) => Promise<TypedData>} queryState Given
 * some query parameters, return a response based on the chain's state.
 * @property {(tx: Transaction) => Promise<TxOptions>} populateTxOptions Given a
 * state-changing transaction, return the existing `tx.opts` augmented with any
 * required chain options that were not specified.
 * @property {(tx: Transaction) => Promise<void>} submitFinishedTx Submit a
 * fully-built and authorized transaction to the chain.  When the promise
 * fulfils, the transaction has been successfully enqueued on one of the chain
 * nodes, but may not yet be included in a block, and its async effects may not
 * yet be complete.
 * @property {(pattern: import('@endo/patterns').Pattern) =>
 * Promise<EventTopic>} subscribeEvents Return a topic that produces events
 * matching the pattern.  Only events raised after the promise fulfils are
 * guaranteed to be produced, so to avoid missing events, await the topic before
 * submitting a transaction.
 */

/**
 * @typedef {Record<string, any>} AccountInfo
 */

/**
 * @typedef {object} CodecRegistry
 * @property {(typeUrl: string, partial: Record<string, any>) => TypedData} encode
 * @property {(typed: Omit<TypedData, 'obj'>) => TypedData} decode
 * @property {(moduleExports: Record<string, any>) => void} registerModule
 */

/**
 * @typedef {object} AccountAgent
 * @property {(tx: Transaction) => Promise<{ results: TypedData[]}>} perform Populate missing
 * options, authorize, and submit a transaction to the chain.  The returned data
 * is the final result of the submission, when the transaction has effectively
 * been committed.
 */

/**
 * @typedef {{typeUrl: string} & Partial<TypedObject & import('@cosmjs/proto-signing').EncodeObject>} TypedData
 */

/**
 * @typedef {object} TypedObject Track the type of a raw object.
 * @property {import('@cosmjs/proto-signing').EncodeObject['typeUrl']} typeUrl The type URL for encoding.
 * @property {Record<string, any>} obj The Javascript object, possibly partial.
 */

/**
 * @typedef {Record<string, any>} TxOptions Chain-specific options for
 * submitting a transaction.  If you don't know what values to use, you can call
 * Chain.suggestTxOptions to fill out the details.
 */

/**
 * @typedef {object} Transaction
 * @property {TypedData[]} messages The messages to be committed in the
 * transaction.  If any fail, the entire transaction is rolled back.
 * @property {TxOptions} [opts] Chain-specific options for the transaction.
 * @property {unknown[]} [authorizations] The authorizations (object
 * capabilities or signatures) for the transaction as a whole.
 */

/**
 * @typedef {EachTopic<TypedData> & LatestTopic<TypedData>} EventTopic A
 * subscriber topic for chain events, with pinned history.
 */

/**
 * @typedef {object} TxAuthorizerKit An entangled pair used to authorize and
 * verify a transaction.
 * @property {TxAuthorizer} authorizer Facet to authorize a transaction.
 * @property {TxVerifier} verifier Facet to verify a transaction was authorized
 * by the kit's authorizer.
 */

/**
 * @typedef {object} TxAuthorizer
 * @property {() => Promise<AccountInfo>} getInfo Get the account information
 * that this authorizer allegedly can authorize.
 * @property {(tx: Transaction) => Promise<unknown>} authorize Create an
 * authorization for the specified transaction.
 */

/**
 * @typedef {object} TxVerifier
 * @property {() => Promise<AccountInfo>} getInfo Get the account
 * address this verifier allegedly can verify.
 * @property {(tx: Transaction) => Promise<boolean>} verify Return true if the
 * transaction was authorized by the Authorizer from the same kit.
 */
