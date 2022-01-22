// @ts-check
import { E, Far } from '@agoric/far';
import { installClientEgress } from './utils.js';
import { GOVERNANCE_OPTIONS_MANIFEST as GOVERNANCE_ACTIONS_MANIFEST } from './manifest.js';

/**
 * @param {{
 *   vatParameters: { argv: Record<string, unknown> },
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   produce: { client: Producer<ClientConfig>, chainBundler: Producer<ChainBundler> },
 * }} powers
 */
export const installSimEgress = async ({
  vatParameters: { argv },
  vats,
  produce: { client, chainBundler },
}) => {
  return Promise.all(
    /** @type { string[] } */ (argv.hardcodedClientAddresses).map(addr =>
      installClientEgress(addr, {
        vats,
        produce: { client, chainBundler },
      }),
    ),
  );
};
harden(installSimEgress);

/**
 * @param {{
 *   consume: { zoe: ERef<ZoeService>, client: ERef<ClientConfig> },
 *   produce: { bridgeManager: Producer<undefined> }
 * }} powers
 */
export const connectFaucet = async ({
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
harden(connectFaucet);

/**
 * @param {{
 *   runBehaviors: (manifest:unknown) => Promise<unknown>,
 *   consume: { client: ERef<ClientConfig> }
 * }} powers
 */
export const grantRunBehaviors = async ({
  runBehaviors,
  consume: { client },
}) => {
  const makeBehaviors = _address =>
    Far('behaviors', { run: manifest => runBehaviors(manifest) });
  return E(client).assignBundle({
    behaviors: makeBehaviors,
    governanceActions: _address => GOVERNANCE_ACTIONS_MANIFEST,
  });
};
harden(grantRunBehaviors);
