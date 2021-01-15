/**
 * @typedef {Object} OracleAdmin
 * @property {() => Promise<void>} delete Remove the oracle from the aggregator
 * @property {(result: any) => Promise<void>} pushResult rather than waiting for
 * the polling query, push a result directly from this oracle
 */

/**
 * @typedef {Object} PriceAggregatorCreatorFacet
 * @property {(quoteMint: Mint) => Promise<void>} initializeQuoteMint
 * @property {(oracleInstance: Instance, query: any=) => Promise<OracleAdmin>} initOracle
 */

/**
 * @typedef {Object} PriceAggregatorPublicFacet
 * @property {() => PriceAuthority} getPriceAuthority
 */

/**
 * @typedef {Object} PriceAggregatorKit
 * @property {PriceAggregatorPublicFacet} publicFacet
 * @property {PriceAggregatorCreatorFacet} creatorFacet
 */

/**
 * @typedef {Object} OraclePublicFacet the public methods accessible from the
 * contract instance
 * @property {(query: any) => ERef<Invitation>} makeQueryInvitation create an
 * invitation for an oracle query
 * @property {(query: any) => ERef<any>} query make an unpaid query
 */

/**
 * @typedef {Object} OracleCreatorFacet the private methods accessible from the
 * contract instance
 * @property {() => AmountKeywordRecord} getCurrentFees get the current
 * fee amounts
 * @property {(total: boolean=) => ERef<Invitation>}
 * makeWithdrawInvitation create an invitation to withdraw fees
 * @property {() => Promise<Invitation>} makeShutdownInvitation
 *   Make an invitation to withdraw all fees and shutdown
 */

/**
 * @typedef {Object} OraclePrivateParameters
 * @property {OracleHandler} oracleHandler
 */

/**
 * @typedef {Object} OracleInitializationFacet
 * @property {(privateParams: OraclePrivateParameters) => OracleCreatorFacet} initialize
 */

/**
 * @typedef {Object} OracleStartFnResult
 * @property {OracleInitializationFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 * @property {Invitation} creatorInvitation
 */

/**
 * @typedef {Object} OracleKit
 * @property {OracleCreatorFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 * @property {Invitation} creatorInvitation
 */

/**
 * @typedef {Object} OracleHandler
 * @property {(query: any, fee: Amount) => Promise<{ reply:
 * any, requiredFee: Amount | undefined }>} onQuery callback to reply to a query
 * @property {(query: any, reason: any) => void} onError notice an error
 * @property {(query: any, reply: any, requiredFee: Amount | undefined) => void} onReply
 * notice a successful reply
 */
