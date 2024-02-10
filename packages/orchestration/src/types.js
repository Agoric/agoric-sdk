// @ts-check
export {};

/**
 * @typedef {object} Chain A fault-tolerant, consensus-based state machine.
 * @property {() => Promise<
 *  { address: AccountAddress, authorizer: TxAuthorizer }
 * >} createAccount Create a fresh (unique) account on this chain, and return a
 * powerful authorizer that should be closely-held, as well as its public
 * address.
 * @property {(queryParams: TypedValue) => Promise<TypedValue>} queryState Given
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
 * @typedef {string} AccountAddress
 */

/**
 * @typedef {object} TypedValue Track the encoding type for a Javascript value.
 * @property {`/${string}` | 'proto.Message'} typeUrl The type URL of the
 * encoded value.  This is usually a target protobuf message type starting with
 * a slash, but may also be `'proto.Message'` indicating that the `value` is
 * already protobuf-encoded data.
 * @property {any} value The value to be encoded.
 */

/**
 * @typedef {Record<string, any>} TxOptions Chain-specific options for
 * submitting a transaction.  If you don't know what values to use, you can call
 * Chain.suggestTxOptions to fill out the details.
 */

/**
 * @typedef {object} Transaction
 * @property {TypedValue[]} msgs The messages to be committed in the
 * transaction.  If any fail, the entire transaction is rolled back.
 * @property {TxOptions} [opts] Chain-specific options for the transaction.
 * @property {unknown[]} [authorizations] The authorizations (object
 * capabilities or signatures) for the transaction as a whole.
 */

/**
 * @typedef {EachTopic<ChainEvent> & LatestTopic<ChainEvent>} EventTopic A
 * subscriber topic for chain events, with pinned history.
 */

/**
 * @typedef {object} ChainEvent A single chain event.
 * @property {TypedValue} event The event's data.
 * @property {bigint} blockHeight The block height at which the event was emitted.
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
 * @property {() => Promise<AccountAddress>} getAllegedAddress Get the account
 * address that this authorizer allegedly can authorize.
 * @property {(tx: Transaction) => Promise<unknown>} authorize Create an
 * authorization for the specified transaction.
 * @property {(tx: Transaction) => Promise<EventTopic>} authorizeAndSubmit
 * Populate missing options, authorize, and submit a transaction to the chain.
 * The returned topic produces the events occuring while processing the
 * transaction, finishing when the transaction has effectively been committed.
 */

/**
 * @typedef {object} TxVerifier
 * @property {() => Promise<AccountAddress>} getAllegedAddress Get the account
 * address this verifier allegedly can verify.
 * @property {(tx: Transaction) => Promise<boolean>} verify Return true if the
 * transaction was authorized by the Authorizer from the same kit.
 */
