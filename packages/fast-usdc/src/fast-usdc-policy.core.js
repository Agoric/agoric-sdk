/** @file core-eval to publish update to Fast USDC feedPolicy */

import { E } from '@endo/far';
import { fromExternalConfig } from './utils/config-marshal.js';
import { FeedPolicyShape } from './type-guards.js';
import { makePublishingStorageKit } from './fast-usdc.start.js';

/**
 * @import {Passable} from '@endo/pass-style'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {FeedPolicy} from './types.js'
 */

const contractName = 'fastUsdc';
const FEED_POLICY = 'feedPolicy';

/**
 * XXX copied from fast-usdc.start.js
 *
 * @param {ERef<StorageNode>} node
 * @param {ERef<Marshaller>} marshaller
 * @param {FeedPolicy & Passable} policy
 */
const publishFeedPolicy = async (node, marshaller, policy) => {
  const feedPolicy = E(node).makeChildNode(FEED_POLICY);
  const value = await E(marshaller).toCapData(policy);
  await E(feedPolicy).setValue(JSON.stringify(value));
};

/**
 * @param {BootstrapPowers &
 *  { consume: { chainStorage: Promise<StorageNode> }}
 * } powers
 * @param {{ options: LegibleCapData<{feedPolicy: FeedPolicy & Passable}> }} config
 */
export const updateFastUsdcPolicy = async (
  { consume: { agoricNames, board, chainStorage } },
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

  const { storageNode, marshaller } = await makePublishingStorageKit(
    contractName,
    { board, chainStorage },
  );

  await publishFeedPolicy(storageNode, marshaller, feedPolicy);
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
          board: true,
        },
      },
    },
    options,
  };
};
