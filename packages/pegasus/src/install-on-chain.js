// @ts-check
import { E } from '@agoric/eventual-send';

export const CONTRACT_NAME = 'Pegasus';

// TODO: TECHDEBT: ambient types don't work here.
/* @param { BootstrapPowers } powers */
export async function installOnChain({
  consume: {
    agoricNames,
    board,
    nameAdmins,
    namesByAddress,
    pegasusBundle: bundleP,
    zoe,
  },
}) {
  // Fetch the nameAdmins we need.
  const [installAdmin, instanceAdmin] = await Promise.all(
    // XXX TECHBEBT: use collectNameAdmins? or refactor bootstrap namehub use
    ['installation', 'instance'].map(async edge => {
      const hub = /** @type {NameHub} */ (await E(agoricNames).lookup(edge));
      return E(nameAdmins).get(hub);
    }),
  );

  const pegasusBundle = await bundleP;
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

  await Promise.all([
    E(installAdmin).update(CONTRACT_NAME, pegasusInstall),
    E(instanceAdmin).update(CONTRACT_NAME, instance),
  ]);
}
