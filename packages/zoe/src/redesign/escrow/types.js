// @ts-check

/**
 * @callback CloseAccount
 *
 * Waits on the promiseToWait, if not undefined, then closes the
 * account, returning the closing amounts
 *
 * @param {Promise=} promiseToWait
 * @returns {Promise<Array<Amount>>}
 */

/**
 * @typedef {{ AFTER_DEADLINE: 'afterDeadline', ON_DEMAND: 'onDemand',
 * OPTIMISTIC: 'optimistic' }} ClosingConditionChoices
 */

/**
 * @typedef {Object} Conditions
 * @property {Array<Amount>} wantedAmounts
 * @property {{ condition: ClosingConditionChoices["AFTER_DEADLINE"] |
 * ClosingConditionChoices["ON_DEMAND"] | ClosingConditionChoices["OPTIMISTIC"], timer: Timer,
 * deadline:Deadline}} closing
 */

/**
 * @typedef {Object} EscrowAccount
 * @property {() => Conditions} getConditions
 * @property {() => Array<Amount>} getCurrentAmounts
 * @property {CloseAccount} closeAccount
 * @property {(additionalPayments: Array<ERef<Payment>>) => Promise<Array<Amount>>} deposit
 * @property {(amountsToWithdraw: Array<Amount>) => void} withdraw
 * @property {() => AccountSnapshot} startTransfer
 */

/**
 * @typedef {Object} AccountSnapshot
 * @property {Seat} seat
 * @property {Conditions} conditions
 * @property {Array<Amount>} currentAmounts
 * @property {Array<Amount>} escrowedAmounts
 */

/**
 * @typedef {Object} ERefDelta
 * @property {ERef<EscrowAccount>} account
 * @property {Array<Amount>} add
 * @property {Array<Amount>} subtract
 */

/**
 * @typedef {Object} Delta
 * @property {EscrowAccount} account
 * @property {Array<Amount>} add
 * @property {Array<Amount>} subtract
 */

/**
 * @typedef {Object} SeatDelta
 * @property {Seat} account
 * @property {Array<Amount>} add
 * @property {Array<Amount>} subtract
 */

/**
 * @typedef {Object} ExclusiveDelta
 * @property {ERef<Seat>} seat
 * @property {Array<Amount>} add
 * @property {Array<Amount>} subtract
 */

/**
 * @callback TransferAssets
 * @param {Array<ERefDelta>} deltas
 * @returns {void}
 */

/**
 * @callback CoerceDeltas
 * @param {(escrowAccount: EscrowAccount) => boolean} isEscrowAccount
 * @param {(escrowAccount: EscrowAccount) => boolean} hasSeat
 * @param {Array<ERefDelta>} deltas
 * @returns {Array<Delta>}
 */

/**
 * @typedef {Object} ProposedAllocation
 * @property {EscrowAccount} account
 * @property {Array<Amount>} amounts
 */

/**
 * @callback CalculateAllocations
 * @param {Array<Delta>} deltas
 * @returns {Array<ProposedAllocation>}
 */

/**
 * @callback AddAmounts
 * @param {Array<Amount>} leftAmounts
 * @param {Array<Amount>} rightAmounts
 * @returns {Array<Amount>}
 */

/**
 * @callback SubtractAmounts
 * @param {Array<Amount>} leftAmounts
 * @param {Array<Amount>} rightAmounts
 * @returns {Array<Amount>}
 */

/**
 * @callback StartTransfer
 * @param {Array<ERef<EscrowAccount>>} accounts
 * @returns {Promise<Array<AccountSnapshot>>}
 */

/**
 * @callback CompleteTransfer
 * @param {Array<SeatDelta>} seatDeltas
 * @returns {void}
 */

/**
 * @typedef {Handle<'Seat'>} Seat
 */
