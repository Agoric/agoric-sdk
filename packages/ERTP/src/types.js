// @jessie-check

// Ensure this is a module.
export {};

/// <reference types="ses" />
/**
 * @import {Passable, RemotableObject} from '@endo/pass-style')
 * @import {CopyBag, CopySet, Key} from '@endo/patterns')
 * @import {LatestTopic, NotifierRecord} from '@agoric/notifier');
 */

/** @typedef {{ brand: Brand<'nat'>; value: bigint }} NatAmount */
/**
 * @template {Key} K
 * @typedef {{ brand: Brand<'set'>; value: K[] }} SetAmount
 */
/**
 * @template {Key} K
 * @typedef {{ brand: Brand<'copySet'>; value: CopySet<K> }} CopySetAmount
 */
/**
 * @template {Key} K
 * @typedef {{ brand: Brand<'copyBag'>; value: CopyBag<K> }} CopyBagAmount
 */
/** @typedef {{ brand: Brand<any>; value: any }} AnyAmount */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key]
 * @typedef {K extends 'nat'
 *   ? NatAmount
 *   : K extends 'set'
 *     ? SetAmount<M>
 *     : K extends 'copySet'
 *       ? CopySetAmount<M>
 *       : K extends 'copyBag'
 *         ? CopyBagAmount<M>
 *         : AnyAmount} Amount
 *   Amounts are descriptions of digital assets, answering the questions "how
 *   much" and "of what kind". Amounts are values labeled with a brand.
 *   AmountMath executes the logic of how amounts are changed when digital
 *   assets are merged, separated, or otherwise manipulated. For example, a
 *   deposit of 2 bucks into a purse that already has 3 bucks gives a new purse
 *   balance of 5 bucks. An empty purse has 0 bucks. AmountMath relies heavily
 *   on polymorphic MathHelpers, which manipulate the unbranded portion.
 */

/**
 * @typedef {NatValue | SetValue | CopySet | import('@endo/patterns').CopyBag} AmountValue
 *   An `AmountValue` describes a set or quantity of assets that can be owned or
 *   shared.
 *
 *   A fungible `AmountValue` uses a non-negative bigint to represent a quantity
 *   of that many assets.
 *
 *   A non-fungible `AmountValue` uses an array or CopySet of `Key`s to represent
 *   a set of whatever asset each key represents. A `Key` is a passable value
 *   that can be used as an element in a set (SetStore or CopySet) or as the key
 *   in a map (MapStore or CopyMap).
 *
 *   `SetValue` is for the deprecated set representation, using an array directly
 *   to represent the array of its elements. `CopySet` is the proper
 *   representation using a CopySet.
 *
 *   A semi-fungible `CopyBag` is represented as a `CopyBag` of `Key` objects.
 *   "Bag" is synonymous with MultiSet, where an element of a bag can be present
 *   once or more times, i.e., some positive bigint number of times,
 *   representing that quantity of the asset represented by that key.
 */

/**
 * @typedef {'nat' | 'set' | 'copySet' | 'copyBag'} AssetKind See doc-comment
 *   for `AmountValue`.
 */

/**
 * @template {AssetKind} K
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {K extends 'nat'
 *   ? NatValue
 *   : K extends 'set'
 *     ? SetValue<M>
 *     : K extends 'copySet'
 *       ? CopySet<M>
 *       : K extends 'copyBag'
 *         ? CopyBag<M>
 *         : never} AssetValueForKind
 */

/**
 * @template {AmountValue} V
 * @typedef {V extends NatValue
 *   ? 'nat'
 *   : V extends SetValue
 *     ? 'set'
 *     : V extends CopySet
 *       ? 'copySet'
 *       : V extends import('@endo/patterns').CopyBag
 *         ? 'copyBag'
 *         : never} AssetKindForValue
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} DisplayInfo
 * @property {number} [decimalPlaces] Tells the display software how many
 *   decimal places to move the decimal over to the left, or in other words,
 *   which position corresponds to whole numbers. We require fungible digital
 *   assets to be represented in integers, in the smallest unit (i.e. USD might
 *   be represented in mill, a thousandth of a dollar. In that case,
 *   `decimalPlaces` would be 3.) This property is optional, and for
 *   non-fungible digital assets, should not be specified. The decimalPlaces
 *   property should be used for _display purposes only_. Any other use is an
 *   anti-pattern.
 * @property {K} assetKind - the kind of asset, either AssetKind.NAT (fungible)
 *   or AssetKind.SET or AssetKind.COPY_SET (non-fungible)
 */

// XXX hack around JSDoc union handling
/**
 * @template {AssetKind} K
 * @typedef {object} BrandMethods
 * @property {(allegedIssuer: ERef<Issuer<K>>) => Promise<boolean>} isMyIssuer
 *   Should be used with `issuer.getBrand` to ensure an issuer and brand match.
 * @property {() => string} getAllegedName
 * @property {() => DisplayInfo<K>} getDisplayInfo Give information to UI on how
 *   to display the amount.
 * @property {() => Pattern} getAmountShape
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {RemotableObject & BrandMethods<K>} Brand The brand identifies the
 *   kind of issuer, and has a function to get the alleged name for the kind of
 *   asset described. The alleged name (such as 'BTC' or 'moola') is provided by
 *   the maker of the issuer and should not be trusted as accurate.
 *
 *   Every amount created by a particular issuer will share the same brand, but
 *   recipients cannot rely on the brand to verify that a purported amount
 *   represents the issuer they intended, since the same brand can be reused by
 *   a misbehaving issuer.
 */

// /////////////////////////// Issuer //////////////////////////////////////////

/**
 * @callback IssuerIsLive Return true if the payment continues to exist.
 *
 *   If the payment is a promise, the operation will proceed upon fulfillment.
 * @param {ERef<Payment>} payment
 * @returns {Promise<boolean>}
 */
/**
 * @template {AssetKind} K
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @callback IssuerGetAmountOf Get the amount of digital assets in the payment.
 *   Because the payment is not trusted, we cannot call a method on it directly,
 *   and must use the issuer instead.
 *
 *   If the payment is a promise, the operation will proceed upon fulfillment.
 * @param {ERef<Payment<K, M>>} payment
 * @returns {Promise<Amount<K, M>>}
 */

/**
 * @callback IssuerBurn Burn all of the digital assets in the payment.
 *   `optAmountShape` is optional. If the `optAmountShape` pattern is present,
 *   the amount of the digital assets in the payment must match
 *   `optAmountShape`, to prevent sending the wrong payment and other
 *   confusion.
 *
 *   If the payment is a promise, the operation will proceed upon fulfillment.
 *
 *   As always with optional `Pattern` arguments, keep in mind that technically
 *   the value `undefined` itself is a valid `Key` and therefore a valid
 *   `Pattern`. But in optional pattern position, a top level `undefined` will
 *   be interpreted as absence. If you want to express a `Pattern` that will
 *   match only `undefined`, use `M.undefined()` instead.
 * @param {ERef<Payment>} payment
 * @param {Pattern} [optAmountShape]
 * @returns {Promise<Amount>}
 */

/**
 * @template {AssetKind} K
 * @template {Key} M
 * @typedef {object} IssuerMethods Work around JSDoc union handling
 * @property {() => Brand<K>} getBrand Get the Brand for this Issuer. The Brand
 *   indicates the type of digital asset and is shared by the mint, the issuer,
 *   and any purses and payments of this particular kind. The brand is not
 *   closely held, so this function should not be trusted to identify an issuer
 *   alone. Fake digital assets and amount can use another issuer's brand.
 * @property {() => string} getAllegedName Get the allegedName for this
 *   mint/issuer
 * @property {() => K} getAssetKind Get the kind of MathHelpers used by this
 *   Issuer.
 * @property {() => DisplayInfo<K>} getDisplayInfo Give information to UI on how
 *   to display amounts for this issuer.
 * @property {() => Purse<K, M>} makeEmptyPurse Make an empty purse of this
 *   brand.
 * @property {IssuerIsLive} isLive
 * @property {IssuerGetAmountOf<K, M>} getAmountOf
 * @property {IssuerBurn} burn
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {RemotableObject & IssuerMethods<K, M>} Issuer The issuer cannot
 *   mint a new amount, but it can create empty purses and payments. The issuer
 *   can also transform payments (splitting payments, combining payments,
 *   burning payments, and claiming payments exclusively). The issuer should be
 *   gotten from a trusted source and then relied upon as the decider of whether
 *   an untrusted payment is valid.
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} PaymentLedger
 * @property {Mint<K>} mint
 * @property {Purse<K>} mintRecoveryPurse Externally useful only if this issuer
 *   uses recovery sets. Can be used to get the recovery set associated with
 *   minted payments that are still live.
 * @property {Issuer<K>} issuer
 * @property {Brand<K>} brand
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {object} IssuerKit
 * @property {Mint<K, M>} mint
 * @property {Purse<K, M>} mintRecoveryPurse Externally useful only if this
 *   issuer uses recovery sets. Can be used to get the recovery set associated
 *   with minted payments that are still live.
 * @property {Issuer<K, M>} issuer
 * @property {Brand<K>} brand
 * @property {DisplayInfo} displayInfo
 */

/**
 * @typedef {object} AdditionalDisplayInfo
 * @property {number} [decimalPlaces] Tells the display software how many
 *   decimal places to move the decimal over to the left, or in other words,
 *   which position corresponds to whole numbers. We require fungible digital
 *   assets to be represented in integers, in the smallest unit (i.e. USD might
 *   be represented in mill, a thousandth of a dollar. In that case,
 *   `decimalPlaces` would be 3.) This property is optional, and for
 *   non-fungible digital assets, should not be specified. The decimalPlaces
 *   property should be used for _display purposes only_. Any other use is an
 *   anti-pattern.
 * @property {AssetKind} [assetKind]
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {object} Mint Holding a Mint carries the right to issue new digital
 *   assets. These assets all have the same kind, which is called a Brand.
 * @property {() => Issuer<K, M>} getIssuer Gets the Issuer for this mint.
 * @property {(newAmount: Amount<K>) => Payment<K, M>} mintPayment Creates a new
 *   Payment containing newly minted amount.
 */

// /////////////////////////// Purse / Payment /////////////////////////////////

/**
 * Issuers first became durable with mandatory recovery sets. Later they were
 * made optional, but there is no support for converting from one state to the
 * other. Thus, absence of a `RecoverySetsOption` state is equivalent to
 * `'hasRecoverySets'`. In the absence of a `recoverySetsOption` parameter,
 * upgradeIssuerKit defaults to the predecessor's `RecoverySetsOption` state, or
 * `'hasRecoverySets'` if none.
 *
 * At this time, issuers started in one of the states (`'noRecoverySets'`, or
 * `'hasRecoverySets'`) cannot be converted to the other on upgrade. If this
 * transition is needed, it can likely be supported in a future upgrade. File an
 * issue on github and explain what you need and why.
 *
 * @typedef {'hasRecoverySets' | 'noRecoverySets'} RecoverySetsOption
 */

// /////////////////////////// Purse / Payment /////////////////////////////////

/**
 * @callback DepositFacetReceive
 * @param {Payment} payment
 * @param {Pattern} [optAmountShape]
 * @returns {Amount}
 */

/**
 * @typedef {object} DepositFacet
 * @property {DepositFacetReceive} receive Deposit all the contents of payment
 *   into the purse that made this facet, returning the amount. If the optional
 *   argument `optAmount` does not equal the amount of digital assets in the
 *   payment, throw an error.
 *
 *   If payment is a promise, throw an error.
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {RemotableObject & PurseMethods<K, M>} Purse Purses hold amount of
 *   digital assets of the same brand, but unlike Payments, they are not meant
 *   to be sent to others. To transfer digital assets, a Payment should be
 *   withdrawn from a Purse. The amount of digital assets in a purse can change
 *   through the action of deposit() and withdraw().
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {object} PurseMethods The primary use for Purses and Payments is for
 *   currency-like and goods-like digital assets, but they can also be used to
 *   represent other kinds of rights, such as the right to participate in a
 *   particular contract.
 * @property {() => Brand<K>} getAllegedBrand Get the alleged Brand for this
 *   Purse
 * @property {() => Amount<K, M>} getCurrentAmount Get the amount contained in
 *   this purse.
 * @property {() => LatestTopic<Amount<K, M>>} getCurrentAmountNotifier Get a
 *   lossy notifier for changes to this purse's balance.
 * @property {<P extends Payment<K, M>>(
 *   payment: P,
 *   optAmountShape?: Pattern,
 * ) => P extends Payment<K, M> ? Amount<K, M> : never} deposit
 *   Deposit all the contents of payment into this purse, returning the amount. If
 *   the optional argument `optAmount` does not equal the amount of digital
 *   assets in the payment, throw an error.
 *
 *   If payment is a promise, throw an error.
 * @property {() => DepositFacet} getDepositFacet Return an object whose
 *   `receive` method deposits to the current Purse.
 * @property {(amount: Amount<K, M>) => Payment<K, M>} withdraw Withdraw amount
 *   from this purse into a new Payment.
 * @property {() => CopySet<Payment<K, M>>} getRecoverySet The set of payments
 *   withdrawn from this purse that are still live. These are the payments that
 *   can still be recovered in emergencies by, for example, depositing into this
 *   purse. Such a deposit action is like canceling an outstanding check because
 *   you're tired of waiting for it. Once your cancellation is acknowledged, you
 *   can spend the assets at stake on other things. Afterwards, if the recipient
 *   of the original check finally gets around to depositing it, their deposit
 *   fails.
 *
 *   Returns an empty set if this issuer does not support recovery sets.
 * @property {() => Amount<K, M>} recoverAll For use in emergencies, such as
 *   coming back from a traumatic crash and upgrade. This deposits all the
 *   payments in this purse's recovery set into the purse itself, returning the
 *   total amount of assets recovered.
 *
 *   Returns an empty amount if this issuer does not support recovery sets.
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @template {Key} [M=Key] member kind, for Amounts that have member values
 * @typedef {RemotableObject & PaymentMethods<K>} Payment Payments hold amount
 *   of digital assets of the same brand in transit. Payments can be deposited
 *   in purses, split into multiple payments, combined, and claimed (getting an
 *   exclusive payment). Payments are linear, meaning that either a payment has
 *   the same amount of digital assets it started with, or it is used up
 *   entirely. It is impossible to partially use a payment.
 *
 *   Payments are often received from other actors and therefore should not be
 *   trusted themselves. To get the amount of digital assets in a payment, use
 *   the trusted issuer: issuer.getAmountOf(payment),
 *
 *   Payments can be converted to Purses by getting a trusted issuer and calling
 *   `issuer.makeEmptyPurse()` to create a purse, then
 *   `purse.deposit(payment)`.
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} PaymentMethods
 * @property {() => Brand<K>} getAllegedBrand Get the allegedBrand, indicating
 *   the type of digital asset this payment purports to be, and which issuer to
 *   use. Because payments are not trusted, any method calls on payments should
 *   be treated with suspicion and verified elsewhere.
 */

// /////////////////////////// MathHelpers /////////////////////////////////////

/**
 * @template {AmountValue} [V=AmountValue]
 * @typedef AmountValueSplit
 * @property {V} matched
 * @property {V} change
 */

/**
 * @template {AmountValue} V
 * @typedef {object} MathHelpers All of the difference in how digital asset
 *   amount are manipulated can be reduced to the behavior of the math on
 *   values. We extract this custom logic into mathHelpers. MathHelpers are
 *   about value arithmetic, whereas AmountMath is about amounts, which are the
 *   values labeled with a brand. AmountMath use mathHelpers to do their value
 *   arithmetic, and then brand the results, making a new amount.
 *
 *   The MathHelpers are designed to be called only from AmountMath, and so all
 *   methods but coerce can assume their inputs are valid. They only need to do
 *   output validation, and only when there is a possibility of invalid output.
 * @property {(allegedValue: V) => V} doCoerce Check the kind of this value and
 *   throw if it is not the expected kind.
 * @property {() => V} doMakeEmpty Get the representation for the identity
 *   element (often 0 or an empty array)
 * @property {(value: V) => boolean} doIsEmpty Is the value the identity
 *   element?
 * @property {(left: V, right: V) => boolean} doIsGTE Is the left greater than
 *   or equal to the right?
 * @property {(left: V, right: V) => boolean} doIsEqual Does left equal right?
 * @property {(left: V, right: V) => V} doAdd Return the left combined with the
 *   right.
 * @property {(left: V, right: V) => V} doSubtract Return what remains after
 *   removing the right from the left. If something in the right was not in the
 *   left, we throw an error.
 * @property {(
 *   totalValue: V,
 *   valuePattern: Pattern,
 * ) => AmountValueSplit<V> | undefined} doFrugalSplit
 *   Only needs to deal with the helper-specific cases left over after the
 *   `frugalValueSplit` in amountMath.js has taken case of the cases it can
 *   handle optimally. When `valuePattern` is
 *
 *   - a concrete value (i.e., a `Key`), producing an exact subtract.
 *   - Anything that matches `empty`, since that gives an optimally frugal success.
 *
 *   `doFrugalSplit` should return `undefined` anytime it has nothing further
 *   contribute. That will not be interpreted as saying that failure to split
 *   should be reported. Rather, the caller may then fall back to generic
 *   conservative checks.
 */

/** @typedef {bigint} NatValue */

/**
 * @template {Key} [K=Key]
 * @typedef {K[]} SetValue
 */
