// @ts-check
import {
  bootstrapManifest,
  installClientEgress,
} from './bootstrap-behaviors.js';

export const simBootstrapManifest = harden({
  behaviors: { installSimEgress: true, ...bootstrapManifest.behaviors },
  endowments: {
    installSimEgress: {
      vatParameters: { argv: { hardcodedClientAddresses: true } },
      vats: {
        vattp: true,
        comms: true,
      },
      workspace: true,
    },
    ...bootstrapManifest.endowments,
  },
});

/**
 * @param {{
 *   vatParameters: { argv: Record<string, unknown> },
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   workspace: Record<string, ERef<unknown>>,
 * }} powers
 */
const installSimEgress = async ({ vatParameters, vats, workspace }) => {
  const { argv } = vatParameters;
  return Promise.all(
    /** @type { string[] } */ (argv.hardcodedClientAddresses).map(addr =>
      installClientEgress(addr, { vats, workspace }),
    ),
  );
};

harden({ installSimEgress });
export { installSimEgress };
export * from './bootstrap-behaviors.js';
