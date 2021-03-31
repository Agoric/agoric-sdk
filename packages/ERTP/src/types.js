// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @typedef {import('@agoric/marshal').InterfaceSpec} InterfaceSpec
 * @typedef {import('@agoric/marshal').GetInterfaceOf} GetInterfaceOf
 */

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
 * @typedef {NatValue | SetValue} Value
 * Values describe the value of something that can be owned or shared.
 * Fungible values are normally represented by natural numbers. Other
 * values may be represented as strings naming a particular right, or
 * an arbitrary object that sensibly represents the rights at issue.
 *
 * Value must be Comparable. (Would be nice to type this correctly.)
 */

/**
 * @typedef {'nat' | 'set' | 'strSet'} AmountMathKind
 */

/**
 * @callback MakeEmpty
 * @param {Brand} brand
 * @param {AmountMathKind=} mathKind
 * @returns {Amount}
 */

/**
 * This section blindly imitates what Endo's ses/src/error/types.js
 * does to express type overloaded methods.
 *
 * @callback AmountMakeBrandValue
 * @param {Brand} brand
 * @param {Value} allegedValue
 * @returns {Amount}
 *
 * TODO find out how to get this "deprecated" marking recognized,
 * or remove it.
 * @deprecated Use brand-first overload instead
 * @callback AmountMakeValueBrand
 * Please use the brand-first overload. The value-first overload
 * is deprecated and will go way.
 * @param {Value} brand
 * @param {Brand} allegedValue
 * @returns {Amount}
 *
 * @typedef {AmountMakeBrandValue & AmountMakeValueBrand} AmountMake
 *
 * @callback AmountCoerceBrandAmount
 * @param {Brand} brand
 * @param {Amount} allegedAmount
 * @returns {Amount}
 *
 * TODO find out how to get this "deprecated" marking recognized,
 * or remove it.
 * @deprecated Use brand-first overload instead
 * @callback AmountCoerceAmountBrand
 * Please use the brand-first overload. The amount-first overload
 * is deprecated and will go way.
 * @param {Amount} brand
 * @param {Brand} allegedAmount
 * @returns {Amount}
 *
 * @typedef {AmountCoerceBrandAmount & AmountCoerceAmountBrand} AmountCoerce
 *
 * @callback AmountGetValueBrandAmount
 * @param {Brand} brand
 * @param {Amount} allegedAmount
 * @returns {Amount}
 *
 * TODO find out how to get this "deprecated" marking recognized,
 * or remove it.
 * @deprecated Use brand-first overload instead
 * @callback AmountGetValueAmountBrand
 * Please use the brand-first overload. The amount-first overload
 * is deprecated and will go way.
 * @param {Amount} brand
 * @param {Brand} allegedAmount
 * @returns {Amount}
 *
 * @typedef {AmountGetValueBrandAmount & AmountGetValueAmountBrand} AmountGetValue
 */

/**
 * @typedef {Object} AmountMath
 * Logic for manipulating amounts.
 *
 * Amounts are the canonical description of tradable goods. They are manipulated
 * by issuers and mints, and represent the goods and currency carried by purses
 * and
 * payments. They can be used to represent things like currency, stock, and the
 * abstract right to participate in a particular exchange.
 *
 * @property {AmountMake} make
 * Make an amount from a value by adding the brand.
 * Please use the brand-first overload. The value-first overload
 * is deprecated and will go way.
 *
 * @property {AmountCoerce} coerce
 * Make sure this amount is valid enough, and return a corresponding
 * valid amount if so.
 * Please use the brand-first overload. The amount-first overload
 * is deprecated and will go way.
 *
 * @property {AmountGetValue} getValue
 * Extract and return the value.
 * Please use the brand-first overload. The amount-first overload
 * is deprecated and will go way.
 *
 * @property {MakeEmpty} makeEmpty
 * Return the amount representing an empty amount. This is the
 * identity element for MathHelpers.add and MatHelpers.subtract.
 *
 * @property {(amount: Amount) => Amount} makeEmptyFromAmount
 * Return the amount representing an empty amount, using another
 * amount as the template for the brand and mathKind.
 *
 * @property {(amount: Amount, brand?: Brand) => boolean} isEmpty
 * Return true if the Amount is empty. Otherwise false.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount, brand?: Brand) => boolean} isGTE
 * Returns true if the leftAmount is greater than or equal to the
 * rightAmount. For non-scalars, "greater than or equal to" depends
 * on the kind of amount, as defined by the MathHelpers. For example,
 * whether rectangle A is greater than rectangle B depends on whether rectangle
 * A includes rectangle B as defined by the logic in MathHelpers.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount, brand?: Brand) => boolean} isEqual
 * Returns true if the leftAmount equals the rightAmount. We assume
 * that if isGTE is true in both directions, isEqual is also true
 *
 * @property {(leftAmount: Amount, rightAmount: Amount, brand?: Brand) => Amount} add
 * Returns a new amount that is the union of both leftAmount and rightAmount.
 *
 * For fungible amount this means adding the values. For other kinds of
 * amount, it usually means including all of the elements from both
 * left and right.
 *
 * @property {(leftAmount: Amount, rightAmount: Amount, brand?: Brand) => Amount} subtract
 * Returns a new amount that is the leftAmount minus the rightAmount
 * (i.e. everything in the leftAmount that is not in the
 * rightAmount). If leftAmount doesn't include rightAmount
 * (subtraction results in a negative), throw  an error. Because the
 * left amount must include the right amount, this is NOT equivalent
 * to set subtraction.
 */

/**
 * @typedef {Object} DisplayInfo
 * @property {number=} decimalPlaces
 *   Tells the display software how many decimal places to move the
 *   decimal over to the left, or in other words, which position corresponds to whole
 *   numbers. We require fungible digital assets to be represented in
 *   integers, in the smallest unit (i.e. USD might be represented in mill,
 *   a thousandth of a dollar. In that case, `decimalPlaces` would be 3.)
 *   This property is optional, and for non-fungible digital assets,
 *   should not be specified.
 *   The decimalPlaces property should be used for *display purposes only*. Any
 *   other use is an anti-pattern.
 */

/**
 * @typedef {Object} Brand
 * The brand identifies the kind of issuer, and has a function to get the
 * alleged name for the kind of asset described. The alleged name (such
 * as 'BTC' or 'moola') is provided by the maker of the issuer and should
 * not be trusted as accurate.
 *
 * Every amount created by a particular AmountMath will share the same brand,
 * but recipients cannot rely on the brand to verify that a purported amount
 * represents the issuer they intended, since the same brand can be reused by
 * a misbehaving issuer.
 *
 * @property {(allegedIssuer: ERef<Issuer>) => Promise<boolean>} isMyIssuer Should be used with
 * `issuer.getBrand` to ensure an issuer and brand match.
 * @property {() => string} getAllegedName
 * @property {() => DisplayInfo} getDisplayInfo
 *  Give information to UI on how to display the amount.
 */

/**
 * @typedef {ERef<Payment>} PaymentP
 */

/**
 * @callback IssuerBurn
 * @param {PaymentP} payment
 * @param {Amount=} optAmount
 * @returns {Promise<Amount>}
 */

/**
 * @callback IssuerClaim
 * @param {PaymentP} payment
 * @param {Amount=} optAmount
 * @returns {Promise<Payment>}
 */

/**
 * @typedef {Object} Issuer
 * The issuer cannot mint a new amount, but it can create empty purses and
 * payments. The issuer can also transform payments (splitting payments,
 * combining payments, burning payments, and claiming payments
 * exclusively). The issuer should be gotten from a trusted source and
 * then relied upon as the decider of whether an untrusted payment is valid.
 *
 * @property {() => Brand} getBrand Get the Brand for this Issuer. The Brand
 * indicates the kind of
 * digital asset and is shared by the mint, the issuer, and any purses
 * and payments of this particular kind. The brand is not closely
 * held, so this function should not be trusted to identify an issuer
 * alone. Fake digital assets and amount can use another issuer's brand.
 *
 * @property {() => string} getAllegedName Get the allegedName for this mint/issuer
 * @property {() => AmountMathKind} getAmountMathKind Get the kind of
 * MathHelpers used by this Issuer.
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
 * @property {IssuerBurn} burn
 * Burn all of the digital assets in the payment. `optAmount` is optional.
 * If `optAmount` is present, the code will insist that the amount of
 * the digital assets in the payment is equal to `optAmount`, to
 * prevent sending the wrong payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon resolution.
 *
 * @property {IssuerClaim} claim
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
 * @callback MakeIssuerKit
 * @param {string} allegedName
 * @param {AmountMathKind} [amountMathKind=MathKind.NAT]
 * @param {DisplayInfo=} [displayInfo=undefined]
 * @returns {IssuerKit}
 *
 * The allegedName becomes part of the brand in asset descriptions. The
 * allegedName doesn't have to be a string, but it will only be used for
 * its value. The allegedName is useful for debugging and double-checking
 * assumptions, but should not be trusted.
 *
 * The amountMathKind will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 *  `displayInfo` gives information to UI on how to display the amount.
 *
 * @typedef {Object} IssuerKit
 * The return value of makeIssuerKit
 *
 * @property {Mint} mint
 * @property {Issuer} issuer
 * @property {DeprecatedAmountMath} amountMath
 * @property {Brand} brand
 * @property {AmountMathKind} amountMathKind
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
 * @callback DepositFacetReceive
 * @param {Payment} payment
 * @param {Amount=} optAmount
 * @returns {Amount}
 */

/**
 * @typedef {Object} DepositFacet
 * @property {DepositFacetReceive} receive
 * Deposit all the contents of payment into the purse that made this facet,
 * returning the amount. If the optional argument `optAmount` does not equal the
 * amount of digital assets in the payment, throw an error.
 *
 * If payment is a promise, throw an error.
 */

/**
 * @callback PurseDeposit
 * @param {Payment} payment
 * @param {Amount=} optAmount
 * @returns {Amount}
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
 * Get the amount contained in this purse.
 *
 * @property {() => Notifier<Amount>} getCurrentAmountNotifier
 * Get a lossy notifier for changes to this purse's balance.
 *
 * @property {PurseDeposit} deposit
 * Deposit all the contents of payment into this purse, returning the
 * amount. If the optional argument `optAmount` does not equal the
 * amount of digital assets in the payment, throw an error.
 *
 * If payment is a promise, throw an error.
 *
 * @property {() => DepositFacet} getDepositFacet
 * Return an object whose `receive` method deposits to the current Purse.
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
 * @template V
 * @typedef {Object} MathHelpers<V>
 * All of the difference in how digital asset amount are manipulated can be reduced to
 * the behavior of the math on values. We extract this
 * custom logic into mathHelpers. MathHelpers are about value
 * arithmetic, whereas AmountMath is about amounts, which are the
 * values labeled with a brand. AmountMath use mathHelpers to do their value arithmetic,
 * and then brand the results, making a new amount.
 *
 * The MathHelpers are designed to be called only from AmountMath, and so
 * all methods but coerce can assume their inputs are valid. They only
 * need to do output validation, and only when there is a possibility of
 * invalid output.
 *
 * @property {(allegedValue: V) => V} doCoerce
 * Check the kind of this value and throw if it is not the
 * expected kind.
 *
 * @property {() => V} doMakeEmpty
 * Get the representation for the identity element (often 0 or an
 * empty array)
 *
 * @property {(value: V) => boolean} doIsEmpty
 * Is the value the identity element?
 *
 * @property {(left: V, right: V) => boolean} doIsGTE
 * Is the left greater than or equal to the right?
 *
 * @property {(left: V, right: V) => boolean} doIsEqual
 * Does left equal right?
 *
 * @property {(left: V, right: V) => Value} doAdd
 * Return the left combined with the right.
 *
 * @property {(left: V, right: V) => V} doSubtract
 * Return what remains after removing the right from the left. If
 * something in the right was not in the left, we throw an error.
 */

/**
 * @typedef {bigint} NatValue
 */

/**
 * @typedef {Array<Comparable>} SetValue
 */

/**
 * @typedef {MathHelpers<NatValue>} NatMathHelpers
 */

/**
 * @typedef {MathHelpers<SetValue>} SetMathHelpers
 */

/**
 * @typedef {{ISSUER: 'issuer', BRAND: 'brand', PURSE: 'purse', PAYMENT:
 * 'payment', MINT: 'mint', DEPOSIT_FACET: 'depositFacet' }} ERTPKind
 */

/**
 * @callback MakeInterface
 * Make the interface using the allegedName and kind. The particular
 * structure may change in the future to be more sophisticated.
 * Therefore, ERTP and Zoe should not depend on this particular
 * implementation.
 *
 * @param {string} allegedName The allegedName, as passed to
 *  `makeIssuerKit`
 * @param {string} kind The ERTPKind
 * @returns {InterfaceSpec}
 */

/**
 * @callback MakeFarName
 * Make the farName using the allegedName and kind. The particular
 * structure may change in the future to be more sophisticated.
 * Therefore, ERTP and Zoe should not depend on this particular
 * implementation. `makeFar` converts its farName argument into
 * the iface argument it passes to `Remotable`.
 *
 * @param {string} allegedName The allegedName, as passed to
 *  `makeIssuerKit`
 * @param {string} kind The ERTPKind
 * @returns {string}
 */

/**
 * @typedef {Object} DeprecatedAmountMath
 * This version of amountMath is deprecated. Please use `amountMath` directly
 * as exported by `@agoric/ertp`.
 *
 * @property {() => Brand} getBrand Deprecated
 * @property {() => AmountMathKind} getAmountMathKind  Deprecated
 * @property {(allegedValue: Value) => Amount} make Deprecated
 * @property {(allegedAmount: Amount) => Amount} coerce Deprecated
 * @property {(amount: Amount) => Value} getValue Deprecated
 * @property {() => Amount} getEmpty Deprecated
 * @property {(amount: Amount) => boolean} isEmpty Deprecated
 * @property {(leftAmount: Amount, rightAmount: Amount) => boolean} isGTE Deprecated
 * @property {(leftAmount: Amount, rightAmount: Amount) => boolean} isEqual Deprecated
 * @property {(leftAmount: Amount, rightAmount: Amount) => Amount} add Deprecated
 * @property {(leftAmount: Amount, rightAmount: Amount) => Amount} subtract Deprecated
 */
