import { Fail } from '@endo/errors';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import {
  fetchCoreEvalRelease,
  makeSwingsetTestKit,
  type BootstrapEV,
} from '@aglocal/boot/tools/supports.js';
import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import type { FastUsdcPublishedPathTypes } from '@agoric/fast-usdc';
import type { EconomyBootstrapPowers } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import type { FastUSDCCorePowers } from '../src/start-fast-usdc.core.js';
import type { BootstrapRootObject } from '@agoric/vats/src/core/lib-boot.js';
import type { Remote } from '@agoric/internal';

type ConsumeBootstrapItem = <N extends string>(
  name: N,
) => N extends keyof FastUSDCCorePowers['consume']
  ? FastUSDCCorePowers['consume'][N]
  : N extends keyof EconomyBootstrapPowers['consume']
    ? EconomyBootstrapPowers['consume'][N]
    : unknown;

export type FastUsdcEV = BootstrapEV & {
  vat: <N extends string>(
    name: N,
  ) => N extends 'bootstrap'
    ? Omit<BootstrapRootObject, 'consumeItem'> & {
        // XXX not really local
        consumeItem: ConsumeBootstrapItem;
      } & Remote<{ consumeItem: ConsumeBootstrapItem }>
    : Record<string, (...args: any) => Promise<any>>;
};

export const makeWalletFactoryContext = async (
  t,
  configSpecifier = '@agoric/vm-config/decentral-main-vaults-config.json',
  opts = {},
) => {
  const swingsetTestKit = await makeSwingsetTestKit<FastUsdcPublishedPathTypes>(
    t.log,
    undefined,
    {
      configSpecifier,
      ...opts,
    },
  );

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
    runUtils: swingsetTestKit.runUtils as typeof swingsetTestKit.runUtils & {
      EV: FastUsdcEV;
    },
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
