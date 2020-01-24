import harden from '@agoric/harden';
import { makeAutoswapBackend } from './lib-autoswap';

function build(E) {
  let uiFacet;

  return harden({
    startup: (zoe, registrar, autoswapRegKey, assayRegKeys, assays) => {
      ({ uiFacet } = makeAutoswapBackend(
        E,
        zoe,
        registrar,
        autoswapRegKey,
        assayRegKeys,
        assays,
      ));
    },
    getAutoswapBackend: () => harden(uiFacet),
    getCommandHandler: () =>
      harden({
        processInbound: async obj => {
          const { type, data } = obj;

          if (type === 'autoswapGetPrice') {
            const { unitsIn } = data;
            const unitsOut = await uiFacet.getPrice(unitsIn);
            return { type: 'autoswapPrice', data: unitsOut };
          }

          if (type === 'autoswapGetOfferRules') {
            const { offerRules } = data;
            const hydratedOfferRules = await uiFacet.getOfferRules(offerRules);
            return { type: 'autoswapOfferRules', data: hydratedOfferRules };
          }

          return false;
        },
      }),
  });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, E => build(E), helpers.vatID);
}
