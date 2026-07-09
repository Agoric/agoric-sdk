import { makeWalletFactoryContext as makeWalletFactoryContextShared } from '@aglocal/boot/tools/walletFactoryContext.js';
import type { WalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import type { SwingsetTestKit } from '@aglocal/boot/tools/supports.js';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { PortfolioPublishedPathTypes } from '@aglocal/portfolio-contract/src/type-guards.ts';

type PortfolioSwingsetTestKit = SwingsetTestKit<PortfolioPublishedPathTypes>;
type PortfolioWalletFactoryContext = PortfolioSwingsetTestKit & {
  swingsetTestKit: PortfolioSwingsetTestKit;
  agoricNamesRemotes: AgoricNamesRemotes;
  evalReleasedProposal: (release: string, name: string) => Promise<void>;
  refreshAgoricNamesRemotes: () => void;
  walletFactoryDriver: WalletFactoryDriver;
};

type MakeWalletFactoryContext = (
  t: unknown,
  configSpecifier?: string,
  opts?: Record<string, unknown>,
) => Promise<PortfolioWalletFactoryContext>;

export const makeWalletFactoryContext =
  makeWalletFactoryContextShared as MakeWalletFactoryContext;

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
