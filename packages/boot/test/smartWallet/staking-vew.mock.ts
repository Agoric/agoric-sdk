import type { StakingView } from '@agoric/smart-wallet/src/types.ts';
import { Far } from '@endo/marshal';

// NOTE: only coreEval scope (e.g. Far) allowed
export const mockStakingViewKit = () => {
  const view: StakingView = Far('StakingView', {
    get: addr => {
      assert.typeof(addr, 'string'); // no exo guard
      const qty = BigInt((addr.match(/\d+/g) || []).join(''));
      //   console.debug(addr, 'stake:', qty);
      return qty;
    },
  });
  return { view }; // leave room for write facet
};
