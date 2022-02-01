// @ts-check
import { E, Far } from '@endo/far';
import { GOVERNANCE_ACTIONS_MANIFEST } from './manifest.js';
import { addRemote } from './utils.js';

/**
 * @param {{
 *   vatParameters: { argv: Record<string, unknown> },
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   consume: { clientCreator: ERef<ClientCreator> },
 * }} powers
 */
export const installSimEgress = async ({
  vatParameters: { argv },
  vats: { vattp, comms },
  consume: { clientCreator },
}) => {
  const PROVISIONER_INDEX = 1;

  return Promise.all(
    /** @type { string[] } */ (argv.hardcodedClientAddresses).map(
      async (addr, i) => {
        const clientFacet = await E(clientCreator).createClientFacet(
          `solo${i}`,
          addr,
          ['agoric.ALL_THE_POWERS'],
        );

        await addRemote(addr, { vats: { comms, vattp } });
        await E(comms).addEgress(addr, PROVISIONER_INDEX, clientFacet);
      },
    ),
  );
};
harden(installSimEgress);

/** @param {BootstrapPowers} powers */
export const connectFaucet = async ({ consume: { zoe, client } }) => {
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

/** @param {BootstrapPowers} powers */
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
