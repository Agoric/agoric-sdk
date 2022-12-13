/** @file Boot script for demoing oracles. Builds upon boot-psm to be used in integration tests. */

import { buildRootObject as buildPsmRootObject } from '@agoric/vats/src/core/boot-psm.js';
import { CHAIN_BOOTSTRAP_MANIFEST } from '@agoric/vats/src/core/manifest.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { Far } from '@endo/far';
import {
  installPriceAggregatorContract,
  PRICE_FEEDS_MANIFEST,
  startPriceFeeds,
} from '../src/proposals/price-feed-proposal.js';

/** @typedef {import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} EconomyBootstrapSpace */

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
      installPriceAggregatorContract(
        powersFor(installPriceAggregatorContract.name),
      ),
      startPriceFeeds(powersFor(startPriceFeeds.name), {
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
