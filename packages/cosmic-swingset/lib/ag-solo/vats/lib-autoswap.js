import harden from '@agoric/harden';

import { hydrateUnits, hydrateOfferRules, hydrateMap } from './hydration';

export function makeAutoswapBackend(
  E,
  zoe,
  registrar,
  autoswapRegKey,
  regKeys,
  assays,
) {
  const regKeyToAssayMap = hydrateMap(regKeys, assays);
  const regKeyToTimerMap = undefined;

  const autoswapBackend = harden({
    uiFacet: {
      getPrice: async dehydratedUnits => {
        const instanceHandle = await E(registrar).get(autoswapRegKey);
        const { publicAPI } = await E(zoe).getInstance(instanceHandle);
        const units = hydrateUnits(regKeyToAssayMap, dehydratedUnits);
        return E(publicAPI).getPrice(units);
      },

      getOfferRules: dehydratedOfferRules =>
        hydrateOfferRules(
          regKeyToAssayMap,
          regKeyToTimerMap,
          dehydratedOfferRules,
        ),
    },
  });

  return autoswapBackend;
}
