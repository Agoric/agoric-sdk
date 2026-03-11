import { Fail } from '@endo/errors';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import {
  fetchCoreEvalRelease,
  makeSwingsetTestKit,
} from '@aglocal/boot/tools/supports.js';
import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import {
  getRunUtilsFixtureNameForConfig,
  loadOrCreateRunUtilsFixture,
} from '../../boot/test/tools/runutils-fixtures.js';

export const makeWalletFactoryContext = async (
  t,
  configSpecifier = '@agoric/vm-config/decentral-main-vaults-config.json',
  opts = {},
) => {
  const canResumeFromFixture =
    !opts.snapshot &&
    !opts.storage &&
    !opts.swingStorePath &&
    Object.keys(opts.configOverrides || {}).length === 0;
  // Snapshot restores bypass config rewriting, so keep cold boot for callers
  // that need custom config overrides.
  const snapshot =
    opts.snapshot ||
    (canResumeFromFixture
      ? await (async () => {
          const fixtureName = getRunUtilsFixtureNameForConfig(configSpecifier);
          return fixtureName
            ? loadOrCreateRunUtilsFixture(fixtureName, t.log)
            : undefined;
        })()
      : undefined);
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier,
    ...opts,
    ...(snapshot ? { snapshot } : {}),
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes: AgoricNamesRemotes =
    makeAgoricNamesRemotesFromFakeStorage(swingsetTestKit.storage);
  const refreshAgoricNamesRemotes = () => {
    Object.assign(
      agoricNamesRemotes,
      makeAgoricNamesRemotesFromFakeStorage(swingsetTestKit.storage),
    );
  };
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const evalReleasedProposal = async (release: string, name: string) => {
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

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
