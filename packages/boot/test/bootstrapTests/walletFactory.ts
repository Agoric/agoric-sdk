import { makeWalletFactoryContext as makeWalletFactoryContextShared } from '../../src/walletFactoryContext.js';

export const makeWalletFactoryContext = makeWalletFactoryContextShared;

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
