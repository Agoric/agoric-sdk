/** @file Boot script for demoing oracles. Builds upon boot-psm to be used in integration tests. */

import { buildRootObject as buildPsmRootObject } from '@agoric/vats/src/core/boot-psm.js';
import { CHAIN_BOOTSTRAP_MANIFEST } from '@agoric/vats/src/core/manifest.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { E, Far } from '@endo/far';
import {
  PRICE_FEEDS_MANIFEST,
  startPriceFeeds,
} from '../src/proposals/price-feed-proposal.js';

/** @typedef {import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} EconomyBootstrapSpace */

/** @param {BootstrapSpace & { devices: { vatAdmin: any }, vatPowers: { D: DProxy }, }} powers */
const installPriceAggregatorContract = async ({
  vatPowers: { D },
  devices: { vatAdmin },
  consume: { zoe },
  installation: {
    produce: { priceAggregator },
  },
}) => {
  // Copied from installBootContracts:

  // This really wants to be E(vatAdminSvc).getBundleIDByName, but it's
  // good enough to do D(vatAdmin).getBundleIDByName
  const bundleCap = D(vatAdmin).getNamedBundleCap('priceAggregator');

  const bundle = D(bundleCap).getBundle();
  // TODO (#4374) this should be E(zoe).installBundleID(bundleID);
  const installation = E(zoe).install(bundle);
  priceAggregator.resolve(installation);
};

/**
 * Build root object of the PSM-only bootstrap vat.
 *
 * @param {{
 *   D: DProxy
 *   logger?: (msg: string) => void
 * }} vatPowers
 * @param {{
 *     economicCommitteeAddresses: Record<string, string>,
 *     demoOracleAddresses?: string[],
 *     anchorAssets: { denom: string, keyword?: string }[],
 * }} vatParameters
 */
export const buildRootObject = (vatPowers, vatParameters) => {
  const psmRootObject = buildPsmRootObject(vatPowers, vatParameters);

  const { produce, consume, ...spaces } = psmRootObject.getPromiseSpace();

  const { demoOracleAddresses } = vatParameters;

  const runBootstrapParts = async (vats, devices) => {
    const allPowers = harden({
      vatPowers,
      vatParameters,
      vats,
      devices,
      produce,
      consume,
      ...spaces,
    });
    const manifest = {
      ...CHAIN_BOOTSTRAP_MANIFEST,
      ...PRICE_FEEDS_MANIFEST,
    };
    /** @param {string} name */
    const powersFor = name => {
      const permit = manifest[name];
      assert(permit, `missing permit for ${name}`);
      return utils.extractPowers(permit, allPowers);
    };

    console.log('awaiting startPriceFeeds');
    await Promise.all([
      psmRootObject.bootstrap(vats, devices),
      installPriceAggregatorContract(powersFor('installBootContracts')),
      startPriceFeeds(powersFor('startPriceFeeds'), {
        options: { demoOracleAddresses },
      }),
    ]);
  };

  return Far('bootstrap', {
    bootstrap: (vats, devices) => {
      return runBootstrapParts(vats, devices).catch(e => {
        console.error('BOOTSTRAP FAILED:', e);
        throw e;
      });
    },
  });
};

harden({ buildRootObject });
