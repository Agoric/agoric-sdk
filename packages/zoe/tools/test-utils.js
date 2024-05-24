import { AmountMath } from '@agoric/ertp';
import { makeRatio } from '../src/contractSupport/ratio.js';

/** @param {Pick<IssuerKit<'nat'>, 'brand' | 'issuer' | 'mint'>} kit */
export const withAmountUtils = kit => {
  const decimalPlaces = kit.issuer.getDisplayInfo?.()?.decimalPlaces ?? 6;
  return {
    ...kit,
    /** @param {NatValue} v */
    make: v => AmountMath.make(kit.brand, v),
    makeEmpty: () => AmountMath.makeEmpty(kit.brand),
    /**
     * @param {NatValue} n
     * @param {NatValue} [d]
     */
    makeRatio: (n, d) => makeRatio(n, kit.brand, d),
    /** @param {number} n */
    units: n =>
      AmountMath.make(kit.brand, BigInt(Math.round(n * 10 ** decimalPlaces))),
    /** The intact Exo remotable */
    issuerKit: kit,
  };
};
/** @typedef {ReturnType<typeof withAmountUtils>} AmountUtils */

export { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
