import type { LatestTopic } from '@agoric/notifier';
import type { ERef } from '@endo/far';
import type { RemotableObject } from '@endo/pass-style';
import type { CopyBag, CopySet, Key, Pattern } from '@endo/patterns';
import type { TypeTag } from '@agoric/internal/src/tagged.js';
import type { AssetKind } from './amountMath.js';

export type { AssetKind } from './amountMath.js';

/** This is a generic brand, not necessarily an ERTP brand. It retains the type parameter for compatibility.*/
export type Brand<K extends AssetKind = any> = RemotableObject<K>;

export type NatAmount = {
  brand: Brand<'nat'>;
  value: bigint;
};
export type SetAmount<K extends Key> = {
  brand: Brand<'set'>;
  value: K[];
};
export type CopySetAmount<K extends Key> = {
  brand: Brand<'copySet'>;
  value: CopySet<K>;
};
export type CopyBagAmount<K extends Key> = {
  brand: Brand<'copyBag'>;
  value: CopyBag<K>;
};
export type AnyAmount = {
  brand: Brand<any>;
  value: any;
};
/**
 * Amounts are descriptions of digital assets, answering the questions "how
 * much" and "of what kind". Amounts are values labeled with a brand.
 * AmountMath executes the logic of how amounts are changed when digital
 * assets are merged, separated, or otherwise manipulated. For example, a
 * deposit of 2 bucks into a purse that already has 3 bucks gives a new purse
 * balance of 5 bucks. An empty purse has 0 bucks. AmountMath relies heavily
 * on polymorphic MathHelpers, which manipulate the unbranded portion.
 */
export type Amount<
  K extends AssetKind = AssetKind,
  M extends Key = Key,
> = K extends 'nat'
  ? NatAmount
  : K extends 'set'
    ? SetAmount<M>
    : K extends 'copySet'
      ? CopySetAmount<M>
      : K extends 'copyBag'
        ? CopyBagAmount<M>
        : AnyAmount;
/**
 * An `AmountValue` describes a set or quantity of assets that can be owned or
 * shared.
 *
 * A fungible `AmountValue` uses a non-negative bigint to represent a quantity
 * of that many assets.
 *
 * A non-fungible `AmountValue` uses an array or CopySet of `Key`s to represent
 * a set of whatever asset each key represents. A `Key` is a passable value
 * that can be used as an element in a set (SetStore or CopySet) or as the key
 * in a map (MapStore or CopyMap).
 *
 * `SetValue` is for the deprecated set representation, using an array directly
 * to represent the array of its elements. `CopySet` is the proper
 * representation using a CopySet.
 *
 * A semi-fungible `CopyBag` is represented as a `CopyBag` of `Key` objects.
 * "Bag" is synonymous with MultiSet, where an element of a bag can be present
 * once or more times, i.e., some positive bigint number of times,
 * representing that quantity of the asset represented by that key.
 */
export type AmountValue =
  | NatValue
  | SetValue
  | CopySet
  | import('@endo/patterns').CopyBag;
/**
 * See doc-comment
 *   for `AmountValue`.
 */
export type AssetValueForKind<
  K extends AssetKind,
  M extends Key = Key,
> = K extends 'nat'
  ? NatValue
  : K extends 'set'
    ? SetValue<M>
    : K extends 'copySet'
      ? CopySet<M>
      : K extends 'copyBag'
        ? CopyBag<M>
        : never;
export type AssetKindForValue<V extends AmountValue> = V extends NatValue
  ? 'nat'
  : V extends SetValue
    ? 'set'
    : V extends CopySet
      ? 'copySet'
      : V extends import('@endo/patterns').CopyBag
        ? 'copyBag'
        : never;

export type Ratio = { numerator: Amount<'nat'>; denominator: Amount<'nat'> };

/** @deprecated */
export type DisplayInfo<K extends AssetKind = AssetKind> = {
  /**
   * Tells the display software how many
   * decimal places to move the decimal over to the left, or in other words,
   * which position corresponds to whole numbers. We require fungible digital
   * assets to be represented in integers, in the smallest unit (i.e. USD might
   * be represented in mill, a thousandth of a dollar. In that case,
   * `decimalPlaces` would be 3.) This property is optional, and for
   * non-fungible digital assets, should not be specified. The decimalPlaces
   * property should be used for _display purposes only_. Any other use is an
   * anti-pattern.
   */
  decimalPlaces?: number | undefined;
  /**
   * - the kind of asset, either AssetKind.NAT (fungible)
   * or AssetKind.SET or AssetKind.COPY_SET (non-fungible)
   */
  assetKind: K;
};

/**
 * All of the difference in how digital asset
 *   amount are manipulated can be reduced to the behavior of the math on
 *   values. We extract this custom logic into mathHelpers. MathHelpers are
 *   about value arithmetic, whereas AmountMath is about amounts, which are the
 *   values labeled with a brand. AmountMath use mathHelpers to do their value
 *   arithmetic, and then brand the results, making a new amount.
 *
 *   The MathHelpers are designed to be called only from AmountMath, and so all
 *   methods but coerce can assume their inputs are valid. They only need to do
 *   output validation, and only when there is a possibility of invalid output.
 */
export type MathHelpers<V extends AmountValue> = {
  /**
   * Check the kind of this value and
   * throw if it is not the expected kind.
   */
  doCoerce: (allegedValue: V) => V;
  /**
   * Get the representation for the identity
   * element (often 0 or an empty array)
   */
  doMakeEmpty: () => V;
  /**
   * Is the value the identity
   * element?
   */
  doIsEmpty: (value: V) => boolean;
  /**
   * Is the left greater than
   * or equal to the right?
   */
  doIsGTE: (left: V, right: V) => boolean;
  /**
   * Does left equal right?
   */
  doIsEqual: (left: V, right: V) => boolean;
  /**
   * Return the left combined with the
   * right.
   */
  doAdd: (left: V, right: V) => V;
  /**
   * Return what remains after
   * removing the right from the left. If something in the right was not in the
   * left, we throw an error.
   */
  doSubtract: (left: V, right: V) => V;
};
export type NatValue = bigint;
export type SetValue<K extends Key = Key> = K[];
