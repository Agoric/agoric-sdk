// @ts-check

import { E } from '@agoric/eventual-send';

/**
 * @deprecated use `.bindDefaultFeePurse` directly
 * Partially apply an already existing feePurse to Zoe methods.
 *
 * @param {ERef<ZoeServiceFeePurseRequired>} zoe
 * @param {ERef<FeePurse>} defaultFeePurse
 * @returns {ERef<ZoeService>}
 */
const applyFeePurse = (zoe, defaultFeePurse) => {
  if ('bindDefaultFeePurse' in zoe) {
    return zoe.bindDefaultFeePurse(defaultFeePurse);
  }
  return E(zoe).bindDefaultFeePurse(defaultFeePurse);
};

/**
 * @deprecated use `.bindDefaultFeePurse` directly
 * Make a new feePurse and then partially apply it to Zoe methods.
 *
 * @param {ZoeServiceFeePurseRequired} zoe
 * @returns {{ zoeService: ERef<ZoeService>, feePurse: Promise<FeePurse> }}
 */
const makeAndApplyFeePurse = zoe => {
  const feePurse = E(zoe).makeFeePurse();
  return harden({ zoeService: applyFeePurse(zoe, feePurse), feePurse });
};

harden(applyFeePurse);
harden(makeAndApplyFeePurse);
export { applyFeePurse, makeAndApplyFeePurse };
