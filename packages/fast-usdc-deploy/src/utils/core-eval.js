import { deeplyFulfilledObject, makeTracer, objectMap } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { makeMarshal } from '@endo/marshal';

const trace = makeTracer('FUCoreEval');

/**
 * @import {Remote} from '@agoric/internal';
 * @import {Brand, DepositFacet} from '@agoric/ertp';
 * @import {FastUSDCKit} from '../start-fast-usdc.core.js'
 * @import {FeedPolicy} from '@agoric/fast-usdc/src/types.js'
 */

export const FEED_POLICY = 'feedPolicy';
export const marshalData = makeMarshal(_val => Fail`data only`);

/**
 * @param {Remote<StorageNode>} node
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

const BOARD_AUX = 'boardAux';
/**
 * @param {Brand} brand
 * @param {Pick<BootstrapPowers['consume'], 'board' | 'chainStorage'>} powers
 */
export const publishDisplayInfo = async (brand, { board, chainStorage }) => {
  // chainStorage type includes undefined, which doesn't apply here.
  // @ts-expect-error UNTIL https://github.com/Agoric/agoric-sdk/issues/8247
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  const [id, displayInfo, allegedName] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
    E(brand).getAllegedName(),
  ]);
  const node = E(boardAux).makeChildNode(id);
  const aux = marshalData.toCapData(harden({ allegedName, displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};
