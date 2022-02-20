/**
 * @typedef {string} Address
 */

/**
 * @typedef AttMaker
 * @property {(amountToLien: Amount) => Promise<Payment>} makeAttestation
 * @property {() => Amount }  getLiened
 * @property {() => Promise<AccountState>} getAccountState
 * @property {() => Promise<Invitation>} makeReturnAttInvitation Make an invitation for returning a returnable attestation.
 */

/**
 * @typedef {CopyBag<Address>} ReturnableAttValue
 */

/**
 * @typedef {{getTime: () => Timestamp, updateTime: (currentTime:
 * Timestamp) => void}} StoredTime
 */

/**
 * @typedef {Object} StakingAuthority
 * @property {(address: string, amount: Amount) => Promise<void>} setLiened
 * @property {(address: string, brand: Brand) => ERef<AccountState> } getAccountState
 * @typedef {Object} AccountState
 * @property {Amount} bonded
 * @property {Amount} liened
 * @property {Amount} locked
 * @property {Amount} total
 * @property {Amount} unbonding
 * @property {bigint} currentTime
 */
