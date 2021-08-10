// @ts-check
import { E } from '@agoric/eventual-send';

import pegasusBundle from './bundle-pegasus.js';

/**
 * @param {Object} param0
 * @param {ERef<NameHub>} param0.agoricNames
 * @param {ERef<Board>} param0.board
 * @param {Store<NameHub, NameAdmin>} param0.nameAdmins
 * @param {NameHub} param0.namesByAddress
 * @param {ERef<ZoeService>} param0.zoe
 */
export async function installOnChain({ agoricNames, board, nameAdmins, namesByAddress, zoe }) {
  // Fetch the nameAdmins we need.
  const [installAdmin, instanceAdmin, uiConfigAdmin] = await Promise.all(
    ['installation', 'instance', 'uiConfig'].map(async edge => {
      const hub = /** @type {NameHub} */ (await E(agoricNames).lookup(edge));
      return nameAdmins.get(hub);
    }),
  );

  /** @type {Array<[string, SourceBundle]>} */
  const nameBundles = [['pegasus', pegasusBundle]];
  const [pegasusInstall] = await Promise.all(
    nameBundles.map(async ([name, bundle]) => {
      // Install the bundle in Zoe.
      const install = await E(zoe).install(bundle);
      // Advertise the installation in agoricNames.
      await E(installAdmin).update(name, install);
      // Return for variable assignment.
      return install;
    }),
  );

  const terms = harden({
    board,
    namesByAddress,
  });

  const { instance, creatorFacet } = await E(zoe).startInstance(pegasusInstall, undefined, terms);
 
  const pegasusUiDefaults = {
    CONTRACT_NAME: 'Pegasus',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    // Avoid setting API_URL, so that the UI uses the same origin it came from,
    // if it has an api server.
    // API_URL: 'http://127.0.0.1:8000',
  };

  // Look up all the board IDs.
  const boardIdValue = [
    ['INSTANCE_BOARD_ID', instance],
  ];
  await Promise.all(boardIdValue.map(async ([key, valP]) => {
    const val = await valP;
    const boardId = await E(board).getId(val);
    pegasusUiDefaults[key] = boardId;
  }));

  // Stash the defaults where the UI can find them.
  harden(pegasusUiDefaults);

  // Install the names in agoricNames.
  /** @type {Array<[NameAdmin, string, unknown]>} */
  const nameAdminUpdates = [
    [uiConfigAdmin, pegasusUiDefaults.CONTRACT_NAME, pegasusUiDefaults],
    [installAdmin, pegasusUiDefaults.CONTRACT_NAME, pegasusInstall],
    [instanceAdmin, pegasusUiDefaults.CONTRACT_NAME, instance],
  ];
  await Promise.all(
    nameAdminUpdates.map(([nameAdmin, name, value]) => E(nameAdmin).update(name, value)),
  );

  return creatorFacet;
}
