// @ts-check
import { E } from '@endo/eventual-send';
import pegasusBundle from '../bundles/bundle-pegasus.js';

// TODO: TECHDEBT: ambient types don't work here.
// import '@agoric/vats/src/core/types.js';

export const CONTRACT_NAME = 'Pegasus';

/* @param { BootstrapPowers } powers */
export async function installOnChain({
  consume: { board, namesByAddress, zoe },
  installation: {
    produce: { [CONTRACT_NAME]: produceInstall },
  },
  instance: {
    produce: { [CONTRACT_NAME]: produceInstance },
  },
}) {
  const pegasusInstall = await E(zoe).install(pegasusBundle);

  const terms = harden({
    board,
    namesByAddress,
  });

  const { instance } = await E(zoe).startInstance(
    pegasusInstall,
    undefined,
    terms,
  );

  produceInstall.resolve(pegasusInstall);
  produceInstance.resolve(instance);
}
