import { makeWalletFactoryContext as makeWalletFactoryContextShared } from '@aglocal/boot/walletFactoryContext.js';
import type { WalletFactoryDriver } from '@aglocal/boot/drivers.js';
import type { SwingsetTestKit } from '@aglocal/boot/supports.js';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { FastUSDCCorePowers } from '../src/start-fast-usdc.core.js';

type FastUSDCSwingsetTestKit = SwingsetTestKit<FastUSDCCorePowers>;
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
