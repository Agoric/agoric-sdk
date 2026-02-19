import { makeWalletFactoryContext as makeWalletFactoryContextShared } from '@aglocal/boot/walletFactoryContext.js';

export const makeWalletFactoryContext = makeWalletFactoryContextShared;

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
