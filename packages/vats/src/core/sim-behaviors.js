// @ts-check
import { E, Far } from '@agoric/far';
import { installClientEgress, governanceActions } from './behaviors.js';

export const makeSimBootstrapManifest = bootstrapManifest =>
  harden({
    ...bootstrapManifest,
    ...governanceActions,
    installSimEgress: {
      vatParameters: { argv: { hardcodedClientAddresses: true } },
      vats: {
        vattp: true,
        comms: true,
      },
      produce: { client: true },
    },
    connectFaucet: {
      consume: { zoe: true, client: true },
      produce: { bridgeManager: true },
    },
  });

/**
 * @param {{
 *   vatParameters: { argv: Record<string, unknown> },
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   produce: { client: Producer<ClientConfig> },
 * }} powers
 */
const installSimEgress = async ({
  vatParameters: { argv },
  vats,
  produce: { client },
}) => {
  return Promise.all(
    /** @type { string[] } */ (argv.hardcodedClientAddresses).map(addr =>
      installClientEgress(addr, { vats, produce: { client } }),
    ),
  );
};

/**
 * @param {{
 *   consume: { zoe: ERef<ZoeService>, client: ERef<ClientConfig> },
 *   produce: { bridgeManager: Producer<undefined> }
 * }} powers
 */
const connectFaucet = async ({
  consume: { zoe, client },
  produce: { bridgeManager },
}) => {
  bridgeManager.resolve(undefined); // no bridge in the sim chain

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
export * from './behaviors.js';
