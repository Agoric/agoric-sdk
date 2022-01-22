// @ts-check
import { E, Far } from '@agoric/far';
import { installClientEgress } from './behaviors.js';
import { governanceActions } from './bootEconomy.js';

export const makeSimBootstrapManifest = bootstrapManifest =>
  harden({
    ...bootstrapManifest,
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
    grantRunBehaviors: {
      runBehaviors: true,
      consume: { client: true },
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

/**
 * @param {{
 *   runBehaviors: (manifest:unknown) => Promise<unknown>,
 *   consume: { client: ERef<ClientConfig> }
 * }} powers
 */
const grantRunBehaviors = async ({ runBehaviors, consume: { client } }) => {
  const makeBehaviors = _address =>
    Far('behaviors', { run: manifest => runBehaviors(manifest) });
  return E(client).assignBundle({
    behaviors: makeBehaviors,
    governanceActions: _address => governanceActions,
  });
};

harden({ installSimEgress, connectFaucet, grantRunBehaviors });
export { installSimEgress, connectFaucet, grantRunBehaviors };
export * from './behaviors.js';
export * from './bootEconomy.js';
