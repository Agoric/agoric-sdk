/**
 * Create a purse for a new issuer
 *
 * @callback CreatePurse
 * @param {Issuer} issuer
 * @param {Brand} brand
 * @returns {void}
 */

/**
 * Create a purse for a new, local issuer. Used only for ZCFMint issuers.
 *
 * @callback MakeLocalPurse
 * @param {Issuer} issuer
 * @param {Brand} brand
 * @returns {Purse}
 */

/**
 * Deposits payments or promises for payments according to the
 * `give` property of the proposal. Using the proposal, creates an
 * initial allocation including the amount deposited for `give`
 * keywords and an empty amount for `want` keywords.
 *
 * @callback DepositPayments
 * @param {ProposalRecord} proposal
 * @param {PaymentPKeywordRecord} payments
 * @returns {Promise<Allocation>}
 */
