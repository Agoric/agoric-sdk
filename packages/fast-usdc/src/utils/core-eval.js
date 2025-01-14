import { deeplyFulfilledObject, makeTracer, objectMap } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { makeMarshal } from '@endo/marshal';

const trace = makeTracer('FUCoreEval');

/**
 * @import {Amount, Brand, DepositFacet, Issuer, Payment} from '@agoric/ertp';
 * @import {Passable} from '@endo/pass-style'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {FastUSDCKit} from '../start-fast-usdc.core.js'
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

/**
 * @param {object} powers
 * @param {FastUSDCKit['creatorFacet']} powers.creatorFacet
 * @param {BootstrapPowers['consume']['namesByAddress']} powers.namesByAddress
 * @param {Record<string, string>} oracles
 */
export const inviteOracles = async (
  { creatorFacet, namesByAddress },
  oracles,
) => {
  const oracleDepositFacets = await deeplyFulfilledObject(
    objectMap(
      oracles,
      /** @type {(address: string) => Promise<DepositFacet>} */
      address => E(namesByAddress).lookup(address, 'depositFacet'),
    ),
  );
  await Promise.all(
    Object.entries(oracleDepositFacets).map(async ([name, depositFacet]) => {
      const address = oracles[name];
      trace('making invitation for', name, address);
      const toWatch = await E(creatorFacet).makeOperatorInvitation(address);

      const amt = await E(depositFacet).receive(toWatch);
      trace('sent', amt, 'to', name);
    }),
  );
};
