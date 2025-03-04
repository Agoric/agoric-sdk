/** @file core-eval to publish update to Fast USDC feedPolicy */

import { E } from '@endo/far';
import { FeedPolicyShape } from '@agoric/fast-usdc-worker/src/type-guards.js';
import { fromExternalConfig } from './utils/config-marshal.js';
import { publishFeedPolicy } from './utils/core-eval.js';

/**
 * @import {Issuer} from '@agoric/ertp';
 * @import {Passable} from '@endo/pass-style';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 * @import {LegibleCapData} from './utils/config-marshal.js';
 * @import {FeedPolicy} from '@agoric/fast-usdc-worker/src/types.js';
 */

const contractName = 'fastUsdc';

/**
 * @param {BootstrapPowers &
 *  { consume: { chainStorage: Promise<StorageNode> }}
 * } powers
 * @param {{ options: LegibleCapData<{feedPolicy: FeedPolicy & Passable}> }} config
 */
export const updateFastUsdcPolicy = async (
  { consume: { agoricNames, chainStorage } },
  config,
) => {
  /** @type {Issuer<'nat'>} */
  const USDCissuer = await E(agoricNames).lookup('issuer', 'USDC');
  const brands = harden({
    USDC: await E(USDCissuer).getBrand(),
  });
  const { feedPolicy } = fromExternalConfig(
    config.options,
    brands,
    harden({ feedPolicy: FeedPolicyShape }),
  );

  const storageNode = await E(chainStorage).makeChildNode(contractName);

  await publishFeedPolicy(storageNode, feedPolicy);
};

/**
 * @param {unknown} _utils
 * @param {{
 *   options: LegibleCapData<{feedPolicy: FeedPolicy & Passable}>;
 * }} param1
 */
export const getManifestForUpdateFastUsdcPolicy = (_utils, { options }) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [updateFastUsdcPolicy.name]: {
        consume: {
          chainStorage: true,

          // widely shared: name services
          agoricNames: true,
        },
      },
    },
    options,
  };
};
