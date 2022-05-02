/**
 * @typedef AttestationTool
 * @property {(amountToLien: Amount<'nat'>) => Promise<Payment>} makeAttestation
 * @property {() => Promise<AccountState>} getAccountState
 * @property {(lienedAmount: Amount<'nat'>) => Amount<'copyBag'>} wrapLienedAmount
 * @property {(attAmount: Amount<'copyBag'>) => Amount<'nat'>} unwrapLienedAmount
 * @property {() => Promise<Invitation>} makeReturnAttInvitation Make an invitation for returning an attestation.
 */

/**
 * @typedef {CopyBag<Address>} ReturnableAttValue
 */

/**
 * @typedef {{getTime: () => Timestamp, updateTime: (currentTime:
 * Timestamp) => void}} StoredTime
 */

/**
 * @typedef {object} StakingAuthority
 * @property {(address: Address, previous: Amount, target: Amount<'nat'>) => Promise<void>} setLiened
 * @property {(address: Address, brand: Brand<'nat'>) => ERef<AccountState> } getAccountState
 * @typedef {object} AccountState
 * @property {Amount<'nat'>} bonded
 * @property {Amount<'nat'>} liened
 * @property {Amount<'nat'>} locked
 * @property {Amount<'nat'>} total
 * @property {Amount<'nat'>} unbonding
 * @property {bigint} currentTime
 *
 * Performance note: getAccountState is expensive, as it has to iterate over all
 * delegations.
 *
 * @typedef {(address: Address, brand: Brand<'nat'>) => Amount} GetLiened
 */
