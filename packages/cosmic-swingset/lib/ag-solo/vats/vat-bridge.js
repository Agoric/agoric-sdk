import { E } from '@agoric/eventual-send';
import { makeBridgeManager } from './bridge';

export function buildRootObject({ D }) {
  return harden({
    makeBridgeManager(bridgeDevice) {
      return makeBridgeManager(E, D, bridgeDevice);
    },
  });
}
