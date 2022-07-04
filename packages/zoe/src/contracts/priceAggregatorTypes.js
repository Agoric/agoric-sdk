/**
 * @typedef {object} OracleAdmin
 * @property {() => ERef<void>} delete
 * Remove the oracle from the aggregator
 * @property {(result: any) => ERef<void>} pushResult
 * Rather than waiting for the polling query, push a result directly from this oracle
 */

/**
 * @typedef {{} | string} OracleKey
 */

/**
 * @callback PriceAggregatorCreatorFacetInitOracle
 * @param {Instance | string} [oracleInstance]
 * @param {unknown} [query]
 * @returns {Promise<OracleAdmin>}
 */

/**
 * @typedef {object} PriceAggregatorCreatorFacet
 * @property {PriceAggregatorCreatorFacetInitOracle} initOracle
 * @property {(oracleKey: OracleKey) => ERef<void>} deleteOracle
 * @property {(oracleKey?: OracleKey) => ERef<Invitation>} makeOracleInvitation
 */

/**
 * @typedef {object} PriceAggregatorPublicFacet
 * @property {() => PriceAuthority} getPriceAuthority
 * @property {() => ERef<Notifier<bigint> | undefined>} getRoundStartNotifier
 * @property {() => Promise<Notifier<{
 *   submitted: [OracleKey, bigint][],
 *   authenticatedQuote: Payment<'set'>,
 * }>>} getRoundCompleteNotifier
 */

/**
 * @typedef {object} PriceAggregatorKit
 * @property {PriceAggregatorPublicFacet} publicFacet
 * @property {PriceAggregatorCreatorFacet} creatorFacet
 */

/**
 * @typedef {bigint | number | string} ParsableNumber
 * @typedef {Readonly<ParsableNumber | { data: ParsableNumber }>} OraclePriceSubmission
 */

/**
 * @typedef {object} OraclePublicFacet
 * The public methods accessible from the contract instance
 * @property {(query: any) => ERef<Invitation>} makeQueryInvitation
 * Create an invitation for an oracle query
 * @property {(query: any) => ERef<any>} query
 * Make an unpaid query
 */

/**
 * @callback OracleCreatorFacetMakeWithdrawInvitation
 * @param {boolean=} total
 * @returns {ERef<Invitation>}
 */

/**
 * @typedef {object} OracleCreatorFacet
 * The private methods accessible from the contract instance
 * @property {() => AmountKeywordRecord} getCurrentFees
 * Get the current fee amounts
 * @property {OracleCreatorFacetMakeWithdrawInvitation} makeWithdrawInvitation
 * Create an invitation to withdraw fees
 * @property {() => ERef<Invitation>} makeShutdownInvitation
 * Make an invitation to withdraw all fees and shutdown
 */

/**
 * @typedef {object} OraclePrivateParameters
 * @property {OracleHandler} oracleHandler
 */

/**
 * @typedef {object} OracleInitializationFacet
 * @property {(privateParams: OraclePrivateParameters
 * ) => OracleCreatorFacet} initialize
 */

/**
 * @typedef {object} OracleStartFnResult
 * @property {OracleInitializationFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 */

/**
 * @typedef {object} OracleKit
 * @property {OracleCreatorFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 */

/**
 * @typedef {object} OracleReply
 * @property {any} reply
 * @property {Amount} [requiredFee]
 */

/**
 * @typedef {object} OracleHandler
 * @property {(query: any, fee: Amount) => ERef<OracleReply>} onQuery
 * Callback to reply to a query
 * @property {(query: any, reason: any) => void} onError
 * Notice an error
 * @property {(query: any,
 *             reply: any,
 *             requiredFee: Amount | undefined
 * ) => void} onReply
 * Notice a successful reply
 */
