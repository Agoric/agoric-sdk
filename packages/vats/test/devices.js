import bundleCentralSupply from '../bundles/bundle-centralSupply.js';
import bundleMintHolder from '../bundles/bundle-mintHolder.js';
import bundleSingleWallet from '../bundles/bundle-singleWallet.js';
import bundleWalletFactory from '../bundles/bundle-walletFactory.js';

const bundles = {
  centralSupply: bundleCentralSupply,
  mintHolder: bundleMintHolder,
  singleWallet: bundleSingleWallet,
  walletFactory: bundleWalletFactory,
};

export const devices = {
  vatAdmin: {
    getBundleCap: id => {
      assert(id.startsWith('b1-'));
      const name = id.replace(/^b1-/, '');
      const bundle = bundles[name];
      assert(bundle, `unknown bundle ${name}`);
      return bundle;
    },
    getNamedBundleCap: name => ({
      getBundle: () => {
        const bundle = bundles[name];
        assert(bundle, `unknown bundle ${name}`);
        return bundle;
      },
    }),
  },
};
