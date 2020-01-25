import harden from '@agoric/harden';
import { makeAutoswapBackend } from './lib-autoswap';

function build(E) {
  let autoswapBackend;

  return harden({
    startup: (zoe, registrar, autoswapRegKey, assayRegKeys, assays) => {
      autoswapBackend = makeAutoswapBackend(
        E,
        zoe,
        registrar,
        autoswapRegKey,
        assayRegKeys,
        assays,
      );
    },
    getAutoswapBackend: () => harden(autoswapBackend),
    getCommandHandler: () =>
      harden({
        processInbound: async obj => {
          const { type, data } = obj;

          if (type === 'autoswapGetPrice') {
            const { unitsIn } = data;
            const unitsOut = await autoswapBackend.getPrice(unitsIn);
            return { type: 'autoswapPrice', data: unitsOut };
          }

          return false;
        },
      }),
  });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, E => build(E), helpers.vatID);
}
