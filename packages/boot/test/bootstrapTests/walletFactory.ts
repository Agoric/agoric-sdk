import {
  makeBootTestContext,
  type WalletFactoryBootTestContext,
  withWalletFactory,
} from '../tools/boot-test-context.js';

export const makeWalletFactoryContext = async (
  t,
  configSpecifier = '@agoric/vm-config/decentral-main-vaults-config.json',
  opts = {},
) => {
  const ctx = await makeBootTestContext(t, {
    configSpecifier,
    ...opts,
  });
  const walletCtx = await withWalletFactory(ctx);
  return {
    ...walletCtx,
    swingsetTestKit: walletCtx,
  };
};

export type WalletFactoryTestContext = WalletFactoryBootTestContext & {
  swingsetTestKit: WalletFactoryBootTestContext;
};
