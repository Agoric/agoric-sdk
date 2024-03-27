import {
  AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import type { ExecutionContext } from 'ava';
import { makeSwingsetTestKit } from '../../tools/supports.ts';
import { makeWalletFactoryDriver } from '../../tools/drivers.ts';

const { Fail } = assert;

export const makeWalletFactoryContext = async <C>(
  t: ExecutionContext<C>,
  bridgeHandlers?: Record<string, (obj: any) => unknown>,
) => {
  const bundleDir = 'bundles/vaults';
  const swingsetTestKit = await makeSwingsetTestKit(t.log, bundleDir, {
    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
    ...(bridgeHandlers && { bridgeHandlers }),
  });

  const bundleCache = await makeNodeBundleCache(
    bundleDir,
    { cacheSourceMaps: false },
    s => import(s),
  );
  const installations = {} as Record<string, Installation>;

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

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  return {
    ...swingsetTestKit,
    swingsetTestKit,
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver,
    bundleCache,
    installations,
  };
};

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
