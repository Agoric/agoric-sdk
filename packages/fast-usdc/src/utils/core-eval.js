import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { makeMarshal } from '@endo/marshal';

/**
 * @import {Issuer} from '@agoric/ertp';
 * @import {Passable} from '@endo/pass-style'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {FeedPolicy} from '../types.js'
 */

export const FEED_POLICY = 'feedPolicy';
export const marshalData = makeMarshal(_val => Fail`data only`);

/**
 * @param {ERef<StorageNode>} node
 * @param {FeedPolicy} policy
 */
export const publishFeedPolicy = async (node, policy) => {
  const feedPolicy = E(node).makeChildNode(FEED_POLICY);
  const value = marshalData.toCapData(policy);
  await E(feedPolicy).setValue(JSON.stringify(value));
};
