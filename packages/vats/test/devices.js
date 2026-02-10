import { unsafeSharedBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { vatsSourceSpecRegistry } from '../source-spec-registry.js';

const bundleCache = await unsafeSharedBundleCache;
const { centralSupplyBundle: centralSupply, mintHolderBundle: mintHolder } =
  await bundleCache.loadRegistry(vatsSourceSpecRegistry);

export const bundles = {
  centralSupply,
  mintHolder,
};

export const devices = {
  vatAdmin: {
    getNamedBundleCap: name => ({
      getBundle: () => {
        const bundle = bundles[name];
        assert(bundle, `unknown bundle ${name}`);
        return bundle;
      },
    }),
  },
};
