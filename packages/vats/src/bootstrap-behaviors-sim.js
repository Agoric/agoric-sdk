// @ts-check
import { E, Far } from '@agoric/far';
import {
  bootstrapManifest,
  installClientEgress,
} from './bootstrap-behaviors.js';

export const simBootstrapManifest = harden({
  installSimEgress: {
    vatParameters: { argv: { hardcodedClientAddresses: true } },
    vats: {
      vattp: true,
      comms: true,
    },
    workspace: true,
  },
  connectFaucet: { workspace: true },
  ...bootstrapManifest,
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

const connectFaucet = async ({ workspace }) => {
  const { zoe, client } = workspace;
  workspace.bridgeManager = undefined; // no bridge in the sim chain

  const makeFaucet = async _address => {
    const userFeePurse = await E(zoe).makeFeePurse();

    return Far('faucet', {
      tapFaucet: () => [],
      // TODO: obsolete getFeePurse, now that zoe fees are gone?
      getFeePurse: () => userFeePurse,
    });
  };

  return E(client).assignBundle({ faucet: makeFaucet });
};

harden({ installSimEgress, connectFaucet });
export { installSimEgress, connectFaucet };
export * from './bootstrap-behaviors.js';
