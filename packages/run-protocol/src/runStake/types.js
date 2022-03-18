/**
 * @typedef AttMaker
 * @property {(amountToLien: Amount<'nat'>) => Promise<Payment>} makeAttestation
 * @property {() => Amount<'nat'> }  getLiened
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
 * @property {(address: string, previous: Amount, target: Amount<'nat'>) => Promise<void>} setLiened
 * @property {(address: string, brand: Brand<'nat'>) => ERef<AccountState> } getAccountState
 * @typedef {Object} AccountState
 * @property {Amount<'nat'>} bonded
 * @property {Amount<'nat'>} liened
 * @property {Amount<'nat'>} locked
 * @property {Amount<'nat'>} total
 * @property {Amount<'nat'>} unbonding
 * @property {bigint} currentTime
 *
 * @typedef {(address: string, brand: Brand<'nat'>) => Amount} GetLiened
 */
