/**
 * @typedef {string} Address
 */

/**
 * @callback GetAttMaker
 * @param {Address} address
 * @returns {AttMaker}
 */

/**
 * @typedef {Object} AttestationPair
 * @property {Promise<Payment>} expiring
 * @property {Promise<Payment>} returnable
 */

/**
 * @typedef AttMaker
 * @property {(amountToLien: Amount, expiration: Timestamp) => Promise<AttestationPair>} makeAttestations
 * @property {MakeReturnAttInvitation} makeReturnAttInvitation
 * @property {MakeExtendAttInvitation} makeExtendAttInvitation
 */

/**
 * @callback MakeAttMaker
 * @param {Address} address
 * @returns {AttMaker}
 */

/**
 * @callback MakeAttestationsInternal
 * @param {Address} address
 * @param {Amount} amountToLien
 * @param {Timestamp} expiration
 * @returns {Promise<AttestationPair>}
 */

/**
 * @callback Max
 * Return the greater of two Amounts.
 *
 * @param {Amount} x
 * @param {Amount} y
 * @returns {Amount}
 */

/**
 * @callback GetLienAmount
 *
 * @param {Address} address
 * @param {Timestamp} currentTime
 * @returns {Amount}
 */

/**
 * @callback GetReturnableLienAmount
 *
 * @param {Address} address
 * @returns {Amount}
 */

/**
 * @callback AddExpiringLien
 *
 * Given an address string and an Amount to add a lien on and the
 * expiration, record that the amount is "liened", and mint an
 * attestation payment for the amount. Return the payment.
 *
 * @param {Address} address
 * @param {Amount} amount
 * @param {Timestamp} expiration
 * @returns {Promise<Payment>}
 */

/**
 * @callback AddReturnableLien
 *
 * Given an address string and an Amount to put a lien on, record that
 * the Amount is "liened", and mint an attestation payment for the
 * amount liened. Return the payment.
 *
 * @param {Address} address
 * @param {Amount} amount
 * @returns {Promise<Payment>}
 */

/**
 * @typedef {Object} ExpiringAttElem
 * @property {Address} address
 * @property {Amount} amountLiened
 * @property {Timestamp} expiration
 * @property {Handle<'Attestation'>} handle
 */

/**
 * @typedef {Object} ReturnableAttElem
 * @property {Address} address
 * @property {Amount} amountLiened
 */

/**
 * @callback ReturnAttestation
 * @param {ZCFSeat} seat
 * @returns {void}
 */

/**
 * @callback DisallowExtensions
 * @param {Address} address
 * @returns {void}
 */

/**
 * @callback ExtendExpiration
 *
 * Scenario: I have a vote ongoing where I've escrowed a payment and
 * gotten it back. I would like to participate in a second vote with
 * the election closing after the expiration of my payment. I want to
 * extend my payment's expiration to be after the second vote's
 * closing. I must not be able to trick the first vote into escrowing
 * my new payment and double-counting my influence.
 *
 * Only the owner of the liened tokens is allowed to extend the
 * expiration. We will use the holder of the original attestation
 * payment as the measure of this. We can only extend the expiration
 * if we have not already dropped the lien. Therefore to extend, we
 * must still have a record of the attestation (with the unique
 * handle).
 *
 * @param {ZCFSeat} seat
 * @param {Timestamp} newExpiration
 * @returns {void}
 */

/**
 * @callback Slashed
 *
 * On slashing, we disallow any extensions. We do not reduce the liens.
 *
 * @param {Array<Address>} addresses
 * @param {Timestamp} currentTime
 * @returns {void}
 */

/**
 * @callback MakeReturnAttInvitation
 *
 * Make an invitation for returning a returnable attestation.
 *
 * @returns {Promise<Invitation>}
 */

/**
 * @callback MakeExtendAttInvitationInternal
 *
 * Make an invitation for extending the expiration date of an expiring
 * attestation. Internal because the currentTime must be passed in,
 * and that can only come from a trusted source.
 *
 * @param {Timestamp} newExpiration
 * @param {Timestamp} currentTime
 * @returns {Promise<Invitation>}
 */

/**
 * @callback MakeExtendAttInvitation
 *
 * Make an invitation for extending the expiration date of an expiring
 * attestation.
 *
 * @param {Timestamp} newExpiration
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
