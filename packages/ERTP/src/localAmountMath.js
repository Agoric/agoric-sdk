import { E } from '@agoric/eventual-send';
import { makeAmountMath } from './amountMath';

/**
 * @param {Issuer} issuer
 * @returns {Promise<AmountMath>}
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
