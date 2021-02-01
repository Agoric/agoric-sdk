import { E } from '@agoric/eventual-send';

/**
 * @param {ERef<Issuer>} issuer
 * @returns {Promise<AmountMath>}
 */
const makeLocalAmountMath = async issuer => E(issuer).getBrand();

harden(makeLocalAmountMath);

export { makeLocalAmountMath };
