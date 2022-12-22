/**
 * @template {object} R Result type
 * @typedef {object} OracleAdmin
 * @property {() => Promise<void>} delete
 * Remove the oracle from the aggregator
 * @property {(result: R) => Promise<void>} pushResult
 * Rather than waiting for the polling query, push a result directly from this oracle
 */
