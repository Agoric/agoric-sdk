import harden from '@agoric/harden';

import { hydrateUnits, hydrateMap } from './hydration';

export function makeAutoswapBackend(
  E,
  zoe,
  registrar,
  autoswapRegKey,
  regKeys,
  assays,
) {
  const regKeyToAssayMap = hydrateMap(regKeys, assays);

  const autoswapBackend = harden({
    uiFacet: {
      getPrice: async dehydratedUnits => {
        const instanceHandle = await E(registrar).get(autoswapRegKey);
        const { publicAPI } = await E(zoe).getInstance(instanceHandle);
        const units = hydrateUnits(regKeyToAssayMap, dehydratedUnits);
        return E(publicAPI).getPrice(units);
      },
    },
  });

  return autoswapBackend;
}
