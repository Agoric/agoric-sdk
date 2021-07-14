/**
 * @typedef {string} Address
 */

/**
 * @callback GetAttMaker
 * @param {Address} address
 * @returns {AttMaker}
 */

/**
 * @typedef {Object} BLDAttestations
 * @property {Payment} GOV
 * @property {Payment} LOC
 */

/**
 * @typedef AttMaker
 * @property {(amountToLien: Amount, expiration: Timestamp) => Promise<BLDAttestations>} makeAttestations
 * @property {() => Promise<Invitation>} makeReturnAttInvitation
 * @property {() => Promise<Invitation>} makeExtendAttInvitation
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
 * Given an address string and an Amount to add a lien on, record that
 * the amount is "liened", and mint an attestation payment for the amount. Return
 * the payment.
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
 * @property {Handle<'attestation'>} handle
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
