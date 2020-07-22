// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {Object} Amount
 * Amounts are descriptions of digital assets, answering the questions
 * "how much" and "of what kind". Amounts are values labeled with a brand.
 * AmountMath executes the logic of how amounts are changed when digital
 * assets are merged, separated, or otherwise manipulated. For
 * example, a deposit of 2 bucks into a purse that already has 3 bucks
 * gives a new purse balance of 5 bucks. An empty purse has 0 bucks. AmountMath
 * relies heavily on polymorphic MathHelpers, which manipulate the unbranded
 * portion.
 *
 * @property {Brand} brand
 * @property {Value} value
 */

/**
 * @typedef {Object} Value
 * Values describe the value of something that can be owned or shared.
 * Fungible values are normally represented by natural numbers. Other
 * values may be represented as strings naming a particular right, or
 * an arbitrary object that sensibly represents the rights at issue.
 *
 * Value must be Comparable. (This IDL doesn't yet provide a way to specify
 * subtype relationships for structs.)
 */

/**
 * @typedef {Object} AmountMath
 * Logic for manipulating amounts.
 *
 * Amounts are the canonical description of tradable goods. They are manipulated
 * by issuers and mints, and represent the goods and currency carried by purses and
 * payments. They can be used to represent things like currency, stock, and the
 * abstract right to participate in a particular exchange.
 *
 * @property {() => Brand} getBrand Return the brand.
 * @property {() => string} getMathHelpersName
 * Get the name of the mathHelpers used. This can be used as an
 * argument to `makeAmountMath` to create local amountMath.
 *
 * @property {(allegedValue: Value) => Amount} make
 * Make an amount from a value by adding the brand.
 *
 * @property {(allegedAmount: Amount) => Amount} coerce
 * Make sure this amount is valid and return it if so.
 *
 * @property {(amount: Amount) => Value} getValue
 * Extract and return the value.
 *
 * @property {() => Amount} getEmpty
 * Return the amount representing an empty amount. This is the
 * identity element for MathHelpers.add and MatHelpers.subtract.
 *
 * @property {(amount: Amount) => boolean} isEmpty
 * Return true if the Amount is empty. Otherwise false.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => boolean} isGTE
 * Returns true if the leftAmount is greater than or equal to the
 * rightAmount. For non-scalars, "greater than or equal to" depends
 * on the kind of amount, as defined by the MathHelpers. For example,
 * whether rectangle A is greater than rectangle B depends on whether rectangle
 * A includes rectangle B as defined by the logic in MathHelpers.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => boolean} isEqual
 * Returns true if the leftAmount equals the rightAmount. We assume
 * that if isGTE is true in both directions, isEqual is also true
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => Amount} add
 * Returns a new amount that is the union of both leftAmount and rightAmount.
 *
 * For fungible amount this means adding the values. For other kinds of
 * amount, it usually means including all of the elements from both
 * left and right.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount) => Amount} subtract
 * Returns a new amount that is the leftAmount minus the rightAmount
 * (i.e. everything in the leftAmount that is not in the
 * rightAmount). If leftAmount doesn't include rightAmount
 * (subtraction results in a negative), throw  an error. Because the
 * left amount must include the right amount, this is NOT equivalent
 * to set subtraction.
 */

/**
 * @typedef {Object} Brand
 * The brand identifies the kind of issuer, and has a function to get the
 * alleged name for the kind of asset described. The alleged name (such
 * as 'BTC' or 'moola') is provided by the maker of the issuer and should
 * not be trusted as accurate.
 *
 * Every amount created by AmountMath will have the same brand, but recipients
 * cannot use the brand by itself to verify that a purported amount is
 * authentic, since the brand can be reused by a misbehaving issuer.
 *
 * @property {(issuer: Issuer) => boolean} isMyIssuer
 * @property {() => string} getAllegedName
 */

/**
 * @typedef {Payment|PromiseLike<Payment>} PaymentP
 */

/**
 * @typedef {Object} Issuer
 * The issuer cannot mint a new amount, but it can create empty purses and
 * payments. The issuer can also transform payments (splitting payments,
 * combining payments, burning payments, and claiming payments
 * exclusively). The issuer should be gotten from a trusted source and
 * then relied upon as the decider of whether an untrusted payment is valid.
 *
 * @property {() => Brand} getBrand Get the Brand for this Issuer. The Brand indicates the kind of
 * digital asset and is shared by the mint, the issuer, and any purses
 * and payments of this particular kind. The brand is not closely
 * held, so this function should not be trusted to identify an issuer
 * alone. Fake digital assets and amount can use another issuer's brand.
 *
 * @property {() => string} getAllegedName Get the allegedName for this mint/issuer
 * @property {() => AmountMath} getAmountMath Get the AmountMath for this Issuer.
 * @property {() => string} getMathHelpersName Get the name of the MathHelpers for this Issuer.
 * @property {() => Purse} makeEmptyPurse Make an empty purse of this brand.
 * @property {(payment: PaymentP) => Promise<boolean>} isLive
 * Return true if the payment continues to exist.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP) => Promise<Amount>} getAmountOf
 * Get the amount of digital assets in the payment. Because the
 * payment is not trusted, we cannot call a method on it directly,
 * and must use the issuer instead.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP, optAmount?: Amount) => Promise<Amount>} burn
 * Burn all of the digital assets in the payment. `optAmount` is optional.
 * If `optAmount` is present, the code will insist that the amount of
 * the digital assets in the payment is equal to `optAmount`, to
 * prevent sending the wrong payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP, optAmount?: Amount) => Promise<Payment>} claim
 * Transfer all digital assets from the payment to a new payment and
 * delete the original. `optAmount` is optional.
 * If `optAmount` is present, the code will insist that the amount of
 * digital assets in the payment is equal to `optAmount`, to prevent
 * sending the wrong  payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(paymentsArray: PaymentP[]) => Promise<Payment>} combine
 * Combine multiple payments into one payment.
 *
 * If any of the payments is a promise, the operation will proceed upon
 * resolution.
 *
 * @property {(payment: PaymentP, paymentAmountA: Amount) => Promise<Payment[]>} split
 * Split a single payment into two payments, A and B, according to the
 * paymentAmountA passed in.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {(payment: PaymentP, amounts: Amount[]) => Promise<Payment[]>} splitMany
 * Split a single payment into many payments, according to the
 * amounts passed in.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 */

/**
 * @typedef {Object} Brand
 * The Brand indicates the kind of digital asset and is shared by
 * the mint, the issuer, and any purses and payments of this
 * particular kind. Fake digital assets and amount can use another
 * issuer's brand.
 *
 * @property {(allegedIssuer: any) => boolean} isMyIssuer Should be used with
 * `issuer.getBrand` to ensure an issuer and brand match.
 * @property {() => string} getAllegedName
 */

/**
 * @typedef {Object} IssuerMaker
 * Makes Issuers.
 *
 * @property {(allegedName: string, mathHelperName: string) => IssuerKit} makeIssuerKit
 * The allegedName becomes part of the brand in asset descriptions. The
 * allegedName doesn't have to be a string, but it will only be used for
 * its value. The allegedName is useful for debugging and double-checking
 * assumptions, but should not be trusted.
 *
 * The mathHelpersName will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 * @typedef {Object} IssuerKit
 * The return value of makeIssuerKit
 *
 * @property {Mint} mint
 * @property {Issuer} issuer
 * @property {AmountMath} amountMath
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Mint
 * Holding a Mint carries the right to issue new digital assets. These
 * assets all have the same kind, which is called a Brand.
 *
 * @property {() => Issuer} getIssuer Gets the Issuer for this mint.
 * @property {(newAmount: Amount) => Payment} mintPayment
 * Creates a new Payment containing newly minted amount.
 */

/**
 * @typedef {Object} DepositFacet
 * @property {(payment: Payment, optAmount?: Amount) => Amount} receive
 * Deposit all the contents of payment into the purse that made this facet, returning the
 * amount. If the optional argument `optAmount` does not equal the
 * amount of digital assets in the payment, throw an error.
 *
 * If payment is an unresolved promise, throw an error.
 */

/**
 * @typedef {Object} Purse
 * Purses hold amount of digital assets of the same brand, but unlike Payments, they are
 * not meant to be sent to others. To transfer digital assets, a
 * Payment should be withdrawn from a Purse. The amount of digital
 * assets in a purse can change through the action of deposit() and withdraw().
 *
 * The primary use for Purses and Payments is for currency-like and goods-like
 * digital assets, but they can also be used to represent other kinds of rights, such
 * as the right to participate in a particular contract.
 *
 * @property {() => Brand} getAllegedBrand Get the alleged Brand for this Purse
 *
 * @property {() => Amount} getCurrentAmount
 * Get the amount contained in this purse, confirmed by the issuer.
 *
 * @property {(payment: Payment, optAmount?: Amount) => Amount} deposit
 * Deposit all the contents of payment into this purse, returning the
 * amount. If the optional argument `optAmount` does not equal the
 * amount of digital assets in the payment, throw an error.
 *
 * If payment is an unresolved promise, throw an error.
 *
 * @property {() => DepositFacet} makeDepositFacet
 * Create an object whose `deposit` method deposits to the current Purse.
 *
 * @property {(amount: Amount) => Payment} withdraw
 * Withdraw amount from this purse into a new Payment.
 */

/**
 * @typedef {Object} Payment
 * Payments hold amount of digital assets of the same brand in transit. Payments can
 * be deposited in purses, split into multiple payments, combined, and
 * claimed (getting an exclusive payment). Payments are linear, meaning
 * that either a payment has the same amount of digital assets it
 * started with, or it is used up entirely. It is impossible to partially use a payment.
 *
 * Payments are often received from other actors and therefore should
 * not be trusted themselves. To get the amount of digital assets in a payment, use the
 * trusted issuer: issuer.getAmountOf(payment),
 *
 * Payments can be converted to Purses by getting a trusted issuer and
 * calling `issuer.makeEmptyPurse()` to create a purse, then `purse.deposit(payment)`.
 *
 * @property {() => Brand} getAllegedBrand
 * Get the allegedBrand, indicating the kind of digital asset this
 * payment purports to be, and which issuer to use. Because payments
 * are not trusted, any method calls on payments should be treated
 * with suspicion and verified elsewhere.
 */

/**
 * @typedef {Object} MathHelpers
 * All of the difference in how digital asset amount are manipulated can be reduced to
 * the behavior of the math on values. We extract this
 * custom logic into mathHelpers. MathHelpers are about value
 * arithmetic, whereas AmountMath is about amounts, which are the
 * values labeled with a brand. AmountMath use mathHelpers to do their value arithmetic,
 * and then brand the results, making a new amount.
 *
 * @property {(allegedValue: Value) => Value} doCoerce
 * Check the kind of this value and throw if it is not the
 * expected kind.
 *
 * @property {() => Value} doGetEmpty
 * Get the representation for the identity element (often 0 or an
 * empty array)
 *
 * @property {(value: Value) => boolean} doIsEmpty
 * Is the value the identity element?
 *
 * @property {(left: Value, right: Value) => boolean} doIsGTE
 * Is the left greater than or equal to the right?
 *
 * @property {(left: Value, right: Value) => boolean} doIsEqual
 * Does left equal right?
 *
 * @property {(left: Value, right: Value) => Value} doAdd
 * Return the left combined with the right.
 *
 * @property {(left: Value, right: Value) => Value} doSubtract
 * Return what remains after removing the right from the left. If
 * something in the right was not in the left, we throw an error.
 */
