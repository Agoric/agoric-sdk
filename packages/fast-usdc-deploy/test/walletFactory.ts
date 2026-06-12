import { makeWalletFactoryContext as makeWalletFactoryContextShared } from '@aglocal/boot/tools/walletFactoryContext.js';
import type { WalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import type { SwingsetTestKit } from '@aglocal/boot/tools/supports.js';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { FastUsdcPublishedPathTypes } from '@agoric/fast-usdc';
import type { EconomyBootstrapPowers } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import type { FastUSDCCorePowers } from '../src/start-fast-usdc.core.js';

type FastUSDCSwingsetTestKit = SwingsetTestKit<
  FastUsdcPublishedPathTypes,
  FastUSDCCorePowers['consume'] & EconomyBootstrapPowers['consume']
>;
type FastUSDCWalletFactoryContext = FastUSDCSwingsetTestKit & {
  swingsetTestKit: FastUSDCSwingsetTestKit;
  agoricNamesRemotes: AgoricNamesRemotes;
  evalReleasedProposal: (release: string, name: string) => Promise<void>;
  refreshAgoricNamesRemotes: () => void;
  walletFactoryDriver: WalletFactoryDriver;
};

type MakeWalletFactoryContext = (
  t: unknown,
  configSpecifier?: string,
  opts?: Record<string, unknown>,
) => Promise<FastUSDCWalletFactoryContext>;

export const makeWalletFactoryContext =
  makeWalletFactoryContextShared as MakeWalletFactoryContext;

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
