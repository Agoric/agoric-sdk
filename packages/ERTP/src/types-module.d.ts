/**
 * @file Generated from types.js, then find-replace to export all
 *
 * This file exists because types.js is ambient and some modules need the types
 * to be explictly imported. Changing types.js to a module breaks too much.
 */
/* eslint-disable no-use-before-define */
export type InterfaceSpec = import('@endo/marshal').InterfaceSpec;
export type GetInterfaceOf = import('@endo/marshal').MarshalGetInterfaceOf;
/**
 * Amounts are descriptions of digital assets, answering the questions
 * "how much" and "of what kind". Amounts are values labeled with a brand.
 * AmountMath executes the logic of how amounts are changed when digital
 * assets are merged, separated, or otherwise manipulated. For
 * example, a deposit of 2 bucks into a purse that already has 3 bucks
 * gives a new purse balance of 5 bucks. An empty purse has 0 bucks. AmountMath
 * relies heavily on polymorphic MathHelpers, which manipulate the unbranded
 * portion.
 */
export type Amount<K extends AssetKind = AssetKind> = {
  brand: Brand<K>;
  value: AssetValueForKind<K>;
};
/**
 * An `AmountValue` describes a set or quantity of assets that can be owned or
 * shared.
 *
 * A fungible `AmountValue` uses a non-negative bigint to represent a quantity
 * of that many assets.
 *
 * A non-fungible `AmountValue` uses an array or CopySet of `Key`s to represent
 * a set of whatever asset each key represents. A `Key` is a passable value
 * that can be used as an element in a set (SetStore or CopySet) or as the
 * key in a map (MapStore or CopyMap).
 *
 * `SetValue` is for the deprecated set representation, using an array directly
 * to represent the array of its elements. `CopySetValue` is the proper
 * representation using a CopySet.
 *
 * A semi-fungible `CopyBagValue` is represented as a
 * `CopyBag` of `Key` objects. "Bag" is synonymous with MultiSet, where an
 * element of a bag can be present once or more times, i.e., some positive
 * bigint number of times, representing that quantity of the asset represented
 * by that key.
 */
export type AmountValue = NatValue | any[] | CopySetValue | CopyBagValue;
/**
 * "Value" is a deprecated alias for "AmountValue". Please use
 * "AmountValue" instead.
 */
export type Value = AmountValue;
/**
 * See doc-comment for `AmountValue`.
 */
export type AssetKind = 'nat' | 'set' | 'copySet' | 'copyBag';
export type AssetValueForKind<K extends AssetKind> = K extends 'nat'
  ? NatValue
  : K extends 'set'
  ? any[]
  : K extends 'copySet'
  ? CopySetValue
  : K extends 'copyBag'
  ? CopyBagValue
  : never;
export type AssetKindForValue<V extends AmountValue> = V extends NatValue
  ? 'nat'
  : V extends any[]
  ? 'set'
  : V extends CopySetValue
  ? 'copySet'
  : V extends CopyBagValue
  ? 'copyBag'
  : never;
export type DisplayInfo<K extends AssetKind = AssetKind> = {
  /**
   * Tells the display software how
   * many decimal places to move the decimal over to the left, or in
   * other words, which position corresponds to whole numbers. We
   * require fungible digital assets to be represented in integers, in
   * the smallest unit (i.e. USD might be represented in mill, a
   * thousandth of a dollar. In that case, `decimalPlaces` would be
   * 3.) This property is optional, and for non-fungible digital
   * assets, should not be specified. The decimalPlaces property
   * should be used for *display purposes only*. Any other use is an
   * anti-pattern.
   */
  decimalPlaces?: number | undefined;
  /**
   * - the kind of asset, either
   * AssetKind.NAT (fungible) or
   * AssetKind.SET or AssetKind.COPY_SET (non-fungible)
   */
  assetKind: K;
};
/**
 * The brand identifies the kind of issuer, and has a function to get the
 * alleged name for the kind of asset described. The alleged name (such
 * as 'BTC' or 'moola') is provided by the maker of the issuer and should
 * not be trusted as accurate.
 *
 * Every amount created by a particular AmountMath will share the same brand,
 * but recipients cannot rely on the brand to verify that a purported amount
 * represents the issuer they intended, since the same brand can be reused by
 * a misbehaving issuer.
 */
export type Brand<K extends AssetKind = AssetKind> = {
  /**
   * Should be used with `issuer.getBrand` to ensure an issuer and brand match.
   */
  isMyIssuer: (allegedIssuer: ERef<Issuer>) => Promise<boolean>;
  getAllegedName: () => string;
  /**
   * Give information to UI on how to display the amount.
   */
  getDisplayInfo: () => DisplayInfo;
  getAmountShape: () => Pattern;
};
/**
 * Return true if the payment continues to exist.
 *
 * If the payment is a promise, the operation will proceed upon
 * resolution.
 */
export type IssuerIsLive = (payment: ERef<Payment>) => Promise<boolean>;
/**
 * Get the amount of digital assets in the payment. Because the
 * payment is not trusted, we cannot call a method on it directly, and
 * must use the issuer instead.
 *
 * If the payment is a promise, the operation will proceed upon
 * resolution.
 */
export type IssuerGetAmountOf<K extends AssetKind = AssetKind> = (
  payment: ERef<Payment>,
) => Promise<Amount<K>>;
/**
 * Burn all of the digital assets in the
 * payment. `optAmount` is optional. If `optAmount` is present, the
 * code will insist that the amount of the digital assets in the
 * payment is equal to `optAmount`, to prevent sending the wrong
 * payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon
 * resolution.
 */
export type IssuerBurn = (
  payment: ERef<Payment>,
  optAmountShape?: Pattern | undefined,
) => Promise<Amount>;
/**
 * Transfer all digital assets from the payment to a new payment and
 * delete the original. `optAmount` is optional. If `optAmount` is
 * present, the code will insist that the amount of digital assets in
 * the payment is equal to `optAmount`, to prevent sending the wrong
 * payment and other confusion.
 *
 * If the payment is a promise, the operation will proceed upon
 * resolution.
 */
export type IssuerClaim = (
  payment: ERef<Payment>,
  optAmountShape?: Pattern | undefined,
) => Promise<Payment>;
/**
 * Combine multiple payments into one payment.
 *
 * If any of the payments is a promise, the operation will proceed
 * upon resolution.
 */
export type IssuerCombine = (
  paymentsArray: ERef<Payment>[],
  optTotalAmount?: Amount | undefined,
) => Promise<Payment>;
/**
 * Split a single payment into two payments,
 * A and B, according to the paymentAmountA passed in.
 *
 * If the payment is a promise, the operation will proceed upon
 * resolution.
 */
export type IssuerSplit = (
  payment: ERef<Payment>,
  paymentAmountA: Amount,
) => Promise<Payment[]>;
/**
 * Split a single payment into many payments, according to the amounts
 * passed in.
 *
 * If the payment is a promise, the operation will proceed upon
 * resolution.
 */
export type IssuerSplitMany = (
  payment: ERef<Payment>,
  amounts: Amount[],
) => Promise<Payment[]>;
/**
 * The issuer cannot mint a new amount, but it can create empty purses
 * and payments. The issuer can also transform payments (splitting
 * payments, combining payments, burning payments, and claiming
 * payments exclusively). The issuer should be gotten from a trusted
 * source and then relied upon as the decider of whether an untrusted
 * payment is valid.
 */
export type Issuer<K extends AssetKind = AssetKind> = {
  /**
   * Get the Brand for this Issuer. The
   * Brand indicates the type of digital asset and is shared by the
   * mint, the issuer, and any purses and payments of this particular
   * kind. The brand is not closely held, so this function should not be
   * trusted to identify an issuer alone. Fake digital assets and amount
   * can use another issuer's brand.
   */
  getBrand: () => Brand<K>;
  /**
   * Get the allegedName for
   * this mint/issuer
   */
  getAllegedName: () => string;
  /**
   * Get the kind of
   * MathHelpers used by this Issuer.
   */
  getAssetKind: () => AssetKind;
  /**
   * Give information to UI
   * on how to display amounts for this issuer.
   */
  getDisplayInfo: () => DisplayInfo;
  /**
   * Make an empty purse of this
   * brand.
   */
  makeEmptyPurse: () => Purse<K>;
  isLive: IssuerIsLive;
  getAmountOf: IssuerGetAmountOf<K>;
  burn: IssuerBurn;
  claim: IssuerClaim;
  combine: IssuerCombine;
  split: IssuerSplit;
  splitMany: IssuerSplitMany;
};
export type PaymentLedger<K extends AssetKind = AssetKind> = {
  mint: Mint<K>;
  issuer: Issuer<K>;
  brand: Brand<K>;
};
export type IssuerKit<K extends AssetKind = AssetKind> = {
  mint: Mint<K>;
  issuer: Issuer<K>;
  brand: Brand<K>;
  displayInfo: DisplayInfo;
};
export type AdditionalDisplayInfo = {
  /**
   * Tells the display software how
   * many decimal places to move the decimal over to the left, or in
   * other words, which position corresponds to whole numbers. We
   * require fungible digital assets to be represented in integers, in
   * the smallest unit (i.e. USD might be represented in mill, a
   * thousandth of a dollar. In that case, `decimalPlaces` would be
   * 3.) This property is optional, and for non-fungible digital
   * assets, should not be specified. The decimalPlaces property
   * should be used for *display purposes only*. Any other use is an
   * anti-pattern.
   */
  decimalPlaces?: number | undefined;
  assetKind?: AssetKind | undefined;
};
/**
 * Called to shut something down because something went wrong, where the reason
 * is supposed to be an Error that describes what went wrong. Some valid
 * implementations of `ShutdownWithFailure` will never return, either
 * because they throw or because they immediately shutdown the enclosing unit
 * of computation. However, they also might return, so the caller should
 * follow this call by their own defensive `throw reason;` if appropriate.
 */
export type ShutdownWithFailure = (reason: Error) => void;
/**
 * Holding a Mint carries the right to issue new digital assets. These
 * assets all have the same kind, which is called a Brand.
 */
export type Mint<K extends AssetKind = AssetKind> = {
  /**
   * Gets the Issuer for this mint.
   */
  getIssuer: () => Issuer<K>;
  /**
   * Creates a new Payment containing newly minted amount.
   */
  mintPayment: (newAmount: Amount<K>) => Payment<K>;
};
export type DepositFacetReceive = (
  payment: Payment,
  optAmountShape?: Pattern | undefined,
) => Amount;
export type DepositFacet = {
  /**
   * Deposit all the contents of payment into the purse that made this facet,
   * returning the amount. If the optional argument `optAmount` does not equal the
   * amount of digital assets in the payment, throw an error.
   *
   * If payment is a promise, throw an error.
   */
  receive: DepositFacetReceive;
};
export type PurseDeposit = (
  payment: Payment,
  optAmountShape?: Pattern | undefined,
) => Amount;
/**
 * Purses hold amount of digital assets of the same brand, but unlike Payments,
 * they are not meant to be sent to others. To transfer digital assets, a
 * Payment should be withdrawn from a Purse. The amount of digital
 * assets in a purse can change through the action of deposit() and withdraw().
 *
 * The primary use for Purses and Payments is for currency-like and goods-like
 * digital assets, but they can also be used to represent other kinds of rights,
 * such as the right to participate in a particular contract.
 */
export type Purse<K extends AssetKind = AssetKind> = {
  /**
   * Get the alleged Brand for this Purse
   */
  getAllegedBrand: () => Brand<K>;
  /**
   * Get the amount contained in this purse.
   */
  getCurrentAmount: () => Amount<K>;
  /**
   * Get a lossy notifier for changes to this purse's balance.
   */
  getCurrentAmountNotifier: () => Notifier<Amount<K>>;
  /**
   * Deposit all the contents of payment into this purse, returning the
   * amount. If the optional argument `optAmount` does not equal the
   * amount of digital assets in the payment, throw an error.
   *
   * If payment is a promise, throw an error.
   */
  deposit: PurseDeposit;
  /**
   * Return an object whose `receive` method deposits to the current Purse.
   */
  getDepositFacet: () => DepositFacet;
  /**
   * Withdraw amount from this purse into a new Payment.
   */
  withdraw: (amount: Amount<K>) => Payment;
  /**
   * The set of payments associated with this purse that are still live. These
   * are the payments that can still be recovered in emergencies by, for example,
   * depositing into this purse. Such a deposit action is like canceling an
   * outstanding check because you're tired of waiting for it. Once your
   * cancellation is acknowledged, you can spend the assets at stake on other
   * things. Afterwards, if the recipient of the original check finally gets
   * around to depositing it, their deposit fails.
   */
  getRecoverySet: () => CopySet<Payment<K>>;
  /**
   * For use in emergencies, such as coming back from a traumatic crash and
   * upgrade. This deposits all the payments in this purse's recovery set
   * into the purse itself, returning the total amount of assets recovered.
   */
  recoverAll: () => Amount<K>;
};
/**
 * Payments hold amount of digital assets of the same brand in transit. Payments
 * can be deposited in purses, split into multiple payments, combined, and
 * claimed (getting an exclusive payment). Payments are linear, meaning
 * that either a payment has the same amount of digital assets it
 * started with, or it is used up entirely. It is impossible to partially use a
 * payment.
 *
 * Payments are often received from other actors and therefore should
 * not be trusted themselves. To get the amount of digital assets in a payment,
 * use the trusted issuer: issuer.getAmountOf(payment),
 *
 * Payments can be converted to Purses by getting a trusted issuer and
 * calling `issuer.makeEmptyPurse()` to create a purse, then
 * `purse.deposit(payment)`.
 */
export type Payment<K extends AssetKind = AssetKind> = {
  /**
   * Get the allegedBrand, indicating the type of digital asset this
   * payment purports to be, and which issuer to use. Because payments
   * are not trusted, any method calls on payments should be treated
   * with suspicion and verified elsewhere.
   */
  getAllegedBrand: () => Brand<K>;
};
/**
 * All of the difference in how digital asset amount are manipulated can be
 * reduced to the behavior of the math on values. We extract this
 * custom logic into mathHelpers. MathHelpers are about value
 * arithmetic, whereas AmountMath is about amounts, which are the
 * values labeled with a brand. AmountMath use mathHelpers to do their value
 * arithmetic, and then brand the results, making a new amount.
 *
 * The MathHelpers are designed to be called only from AmountMath, and so
 * all methods but coerce can assume their inputs are valid. They only
 * need to do output validation, and only when there is a possibility of
 * invalid output.
 */
export type MathHelpers<V extends AmountValue> = {
  /**
   * Check the kind of this value and throw if it is not the
   * expected kind.
   */
  doCoerce: (allegedValue: V) => V;
  /**
   * Get the representation for the identity element (often 0 or an
   * empty array)
   */
  doMakeEmpty: () => V;
  /**
   * Is the value the identity element?
   */
  doIsEmpty: (value: V) => boolean;
  /**
   * Is the left greater than or equal to the right?
   */
  doIsGTE: (left: V, right: V) => boolean;
  /**
   * Does left equal right?
   */
  doIsEqual: (left: V, right: V) => boolean;
  /**
   * Return the left combined with the right.
   */
  doAdd: (left: V, right: V) => V;
  /**
   * Return what remains after removing the right from the left. If
   * something in the right was not in the left, we throw an error.
   */
  doSubtract: (left: V, right: V) => V;
};
export type NatValue = bigint;
export type NatMathHelpers = MathHelpers<NatValue>;
export type SetValue = Array<Key>;
export type SetMathHelpers = MathHelpers<any[]>;
export type CopySetValue = CopySet<Key>;
export type CopySetMathHelpers = MathHelpers<CopySetValue>;
export type CopyBagValue = CopyBag<Key>;
export type CopyBagMathHelpers = MathHelpers<CopyBagValue>;
export type AssertAssetKind = (allegedAK: AssetKind) => void;
