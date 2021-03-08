import { E } from '@agoric/eventual-send';
import { makeAmountMath } from './deprecatedAmountMath';

/**
 * @deprecated Use `amountMath` as exported by `@agoric/ertp` directly
 * @param {ERef<Issuer>} issuer
 * @returns {Promise<DeprecatedAmountMath>}
 */
const makeLocalAmountMath = async issuer => {
  const [brand, amountMathKind] = await Promise.all([
    E(issuer).getBrand(),
    E(issuer).getAmountMathKind(),
  ]);
  return makeAmountMath(brand, amountMathKind);
};

harden(makeLocalAmountMath);

export { makeLocalAmountMath };
