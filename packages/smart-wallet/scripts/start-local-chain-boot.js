// @ts-check

/** @file Boot script for demoing oracles. Builds upon boot-psm to be used in integration tests. */

import * as ERTPmod from '@agoric/ertp';
import {
  PRICE_FEEDS_MANIFEST,
  startPriceFeeds,
} from '@agoric/inter-protocol/src/proposals/price-feed-proposal.js';
import * as startPSMmod from '@agoric/inter-protocol/src/proposals/startPSM.js';
import { M } from '@agoric/store';
import { buildRootObject as buildPsmRootObject } from '@agoric/vats/src/core/boot-psm.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { makeAgoricNamesAccess } from '@agoric/vats/src/core/utils.js';
import { Stable, Stake } from '@agoric/vats/src/tokens.js';
import { E, Far } from '@endo/far';

/** @typedef {import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} EconomyBootstrapSpace */

/**
 * We reserve these keys in name hubs.
 */
export const agoricNamesReserved = harden(
  /** @type {const} */ ({
    issuer: {
      [Stake.symbol]: Stake.proposedName,
      [Stable.symbol]: Stable.proposedName,
      AUSD: 'Agoric bridged USDC',
    },
    brand: {
      [Stake.symbol]: Stake.proposedName,
      [Stable.symbol]: Stable.proposedName,
      AUSD: 'Agoric bridged USDC',
    },
    oracleBrand: {
      USD: 'US Dollar',
    },
    installation: {
      centralSupply: 'central supply',
      mintHolder: 'mint holder',
      walletFactory: 'multitenant smart wallet',
      contractGovernor: 'contract governor',
      committee: 'committee electorate',
      binaryVoteCounter: 'binary vote counter',
      psm: 'Parity Stability Module',
      psmCharter: 'Governance Charter for PSM',
    },
    instance: {
      economicCommittee: 'Economic Committee',
      'psm-IST-AUSD': 'Parity Stability Module: IST:AUSD',
      psmCharter: 'Charter for the PSM',
      walletFactory: 'Smart Wallet Factory',
      provisionPool: 'Provision Pool',
    },
  }),
);

/**
 * @typedef {{
 *   denom: string,
 *   keyword?: string,
 *   proposedName?: string,
 *   decimalPlaces?: number
 * }} AnchorOptions
 */
const AnchorOptionsShape = M.split(
  { denom: M.string() },
  M.partial({
    keyword: M.string(),
    proposedName: M.string(),
    decimalPlaces: M.number(),
  }),
);

export const ParametersShape = M.partial({
  anchorAssets: M.arrayOf(AnchorOptionsShape),
  economicCommitteeAddresses: M.recordOf(M.string(), M.string()),
});

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

  const { produce, consume } = psmRootObject.getPromiseSpace();

  const log = vatPowers.logger || console.info;

  const { demoOracleAddresses } = vatParameters;

  const { spaces } = makeAgoricNamesAccess(log, agoricNamesReserved);

  const runBootstrapParts = async (vats, devices) => {
    /** TODO: BootstrapPowers type puzzle */
    /** @type { any } */
    const allPowers = harden({
      vatPowers,
      vatParameters,
      vats,
      devices,
      produce,
      consume,
      ...spaces,
      // ISSUE: needed? runBehaviors,
      // These module namespaces might be useful for core eval governance.
      modules: {
        utils: { ...utils },
        startPSM: { ...startPSMmod },
        ERTP: { ...ERTPmod },
      },
    });
    const manifest = {
      ...PRICE_FEEDS_MANIFEST,
    };
    /** @param {string} name */
    const powersFor = name => {
      const permit = manifest[name];
      assert(permit, `missing permit for ${name}`);
      return utils.extractPowers(permit, allPowers);
    };

    await Promise.all([
      startPriceFeeds(powersFor('startPriceFeeds'), {
        options: { demoOracleAddresses },
      }),
    ]);
  };

  return Far('bootstrap', {
    bootstrap: (vats, devices) => {
      const { D } = vatPowers;
      D(devices.mailbox).registerInboundHandler(
        Far('dummyInboundHandler', { deliverInboundMessages: () => {} }),
      );

      return runBootstrapParts(vats, devices).catch(e => {
        console.error('BOOTSTRAP FAILED:', e);
        throw e;
      });
    },
    /**
     * Allow kernel to provide things to CORE_EVAL.
     *
     * @param {string} name
     * @param {unknown} resolution
     */
    produceItem: (name, resolution) => {
      assert.typeof(name, 'string');
      produce[name].resolve(resolution);
    },
    // expose reset in case we need to do-over
    resetItem: name => {
      assert.typeof(name, 'string');
      produce[name].reset();
    },
    // expose consume mostly for testing
    consumeItem: name => {
      assert.typeof(name, 'string');
      return consume[name];
    },
    // ??? any more dangerous than produceItem/consumeItem?
    /** @type {() => PromiseSpace} */
    getPromiseSpace: () => ({ consume, produce }),
  });
};

harden({ buildRootObject });
