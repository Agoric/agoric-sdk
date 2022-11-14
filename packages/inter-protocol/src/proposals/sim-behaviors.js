import { E, Far } from '@endo/far';
import { addRemote } from '@agoric/vats/src/core/utils.js';

export { connectFaucet, fundAMM } from './demoIssuers.js';

/** @param {BootstrapPowers} powers */
export const installSimEgress = async ({
  vatParameters: { argv },
  vats: { vattp, comms },
  consume: { clientCreator },
}) => {
  const PROVISIONER_INDEX = 1;

  return Promise.all(
    argv.hardcodedClientAddresses.map(async (addr, i) => {
      const clientFacet = await E(clientCreator).createClientFacet(
        `solo${i}`,
        addr,
        ['agoric.ALL_THE_POWERS'],
      );

      await addRemote(addr, { vats: { comms, vattp } });
      await E(comms).addEgress(addr, PROVISIONER_INDEX, clientFacet);
    }),
  );
};
harden(installSimEgress);

/** @param {BootstrapPowers} powers */
export const grantRunBehaviors = async ({
  runBehaviors,
  consume: { client },
}) => {
  const bundle = {
    behaviors: Far('behaviors', { run: manifest => runBehaviors(manifest) }),
  };
  return E(client).assignBundle([_addr => bundle]);
};
harden(grantRunBehaviors);
