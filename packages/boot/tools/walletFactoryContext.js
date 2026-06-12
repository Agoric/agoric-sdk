import { Fail } from '@endo/errors';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { fetchCoreEvalRelease, makeSwingsetTestKit } from './supports.js';
import { makeWalletFactoryDriver } from './drivers.js';

export const makeWalletFactoryContext = async (
  t,
  configSpecifier = '@agoric/vm-config/decentral-main-vaults-config.json',
  opts = {},
) => {
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier,
    ...opts,
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  const refreshAgoricNamesRemotes = () => {
    Object.assign(
      agoricNamesRemotes,
      makeAgoricNamesRemotesFromFakeStorage(swingsetTestKit.storage),
    );
  };
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const evalReleasedProposal = async (release, name) => {
    const materials = await fetchCoreEvalRelease({
      repo: 'Agoric/agoric-sdk',
      release,
      name,
    });
    try {
      await swingsetTestKit.evalProposal(materials);
    } finally {
      refreshAgoricNamesRemotes();
    }
  };

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  return {
    ...swingsetTestKit,
    swingsetTestKit,
    agoricNamesRemotes,
    evalReleasedProposal,
    refreshAgoricNamesRemotes,
    walletFactoryDriver,
  };
};
