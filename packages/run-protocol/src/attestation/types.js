/**
 * @typedef {string} Address
 */

/**
 * @typedef AttMaker
 * @property {(amountToLien: Amount) => Promise<Payment>} makeAttestation
 * @property {() => Amount }  getLiened
 * @property {() => Promise<AccountState>} getAccountState
 * @property {MakeReturnAttInvitation} makeReturnAttInvitation
 */

/**
 * @callback MakeAttMaker
 * @param {Address} address
 * @returns {AttMaker}
 */

/**
 * @typedef {Object} ReturnableAttElem
 * @property {Address} address
 * @property {Amount} amountLiened
 */

/**
 * @callback MakeReturnAttInvitation
 *
 * Make an invitation for returning a returnable attestation.
 *
 * @returns {Promise<Invitation>}
 */

/**
 * @callback GetLiened
 * Get the amount currently liened for the address and brand.
 *
 * @param {Address} addresses
 * @param {Timestamp} currentTime
 * @param {Brand} brand
 * @returns {Amount}
 */

/**
 * @typedef {{getTime: () => Timestamp, updateTime: (currentTime:
 * Timestamp) => void}} StoredTime
 */

/**
 * @typedef {Object} StakingAuthority
 * @property {(address: string, brand: Brand) => ERef<AccountState> } getAccountState
 * @typedef {Object} AccountState
 * @property {Amount} bonded
 * @property {Amount} liened
 * @property {Amount} locked
 * @property {Amount} total
 * @property {Amount} unbonding
 * @property {bigint} currentTime
 */
