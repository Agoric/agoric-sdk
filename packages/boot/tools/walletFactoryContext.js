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

  // Proxy for "bootstrap done": provisionPool is among the last things started
  // and exists in every config (it is committee-governed).
  await EV.vat('bootstrap').consumeItem('provisionPoolStartResult');
  console.timeLog('DefaultTestContext', 'provisionPoolStartResult');

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
