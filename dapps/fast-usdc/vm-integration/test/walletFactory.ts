import { Fail } from '@endo/errors';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { makeSwingsetTestKit } from '@agoric/boot/tools/supports.js';
import { makeWalletFactoryDriver } from '@agoric/boot/tools/drivers.js';

/**
 * Creates a SwingSet test environment with various utilities for testing.
 *
 * This function sets up a complete SwingSet kernel with mocked bridges and
 * utilities for time manipulation, proposal evaluation, and more.
 *
 * @param t - Ava test context
 * @param configSpecifier - Path to the base config file
 * @param opts - Configuration options
 * @param opts.label - Optional label for the test environment
 * @param opts.storage - Storage kit to use (defaults to fake storage)
 * @param opts.verbose - Whether to enable verbose logging
 * @param opts.slogFile - Path to write slog output
 * @param opts.profileVats - Array of vat names to profile
 * @param opts.debugVats - Array of vat names to debug
 * @param opts.defaultManagerType - SwingSet manager type to use
 * @param opts.harness - Optional run harness
 * @param opts.resolveBase - Base URL or path for resolving module paths
 * @returns A test kit with various utilities for interacting with the SwingSet
 */
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
  };
};

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
