// @jessie-check

import { Far } from '@endo/far';
import {
  mapAsyncIterable,
  subscribeEach,
  subscribeLatest,
} from './iterable.js';
import { makeCosmjsFollower } from './follower-cosmjs.js';
import { makeCastingSpec } from './casting-spec.js';

/**
 * @import {CastingSpec} from './types.js';
 * @import {Follower} from './types.js';
 * @import {ValueFollowerElement} from './types.js';
 * @import {LeaderOrMaker} from './types.js';
 * @import {FollowerOptions} from './types.js';
 * @import {ValueFollower} from './follower-cosmjs.js';
 * @import {ERef} from '@agoric/vow';
 */

/**
 * @template T
 * @param {ERef<CastingSpec>} spec
 */
const makeSubscriptionFollower = spec => {
  const transform = value =>
    harden({ value, blockHeight: NaN, currentBlockHeight: NaN });
  /** @type {Follower<ValueFollowerElement<T>>} */
  const follower = Far('subscription/notifier follower', {
    getLatestIterable: async () => {
      const { notifier, subscription } = await spec;
      let ai;
      if (notifier) {
        ai = subscribeLatest(notifier);
      } else {
        assert(subscription);
        ai = subscribeEach(subscription);
      }
      return mapAsyncIterable(ai, transform);
    },

    getEachIterable: async () => {
      const { notifier, subscription } = await spec;
      let ai;
      if (subscription) {
        ai = subscribeEach(subscription);
      } else {
        assert(notifier);
        ai = subscribeLatest(notifier);
      }
      return mapAsyncIterable(ai, transform);
    },

    getReverseIterable: async () => {
      throw Error(
        'reverse iteration not implemented for subscription follower',
      );
    },
  });
  return follower;
};

/**
 * @template T
 * @param {ERef<CastingSpec> | string} specP
 * @param {LeaderOrMaker} [leaderOrMaker]
 * @param {FollowerOptions} [options]
 * @returns {Promise<ValueFollower<T>>}
 */
export const makeFollower = async (specP, leaderOrMaker, options) => {
  const spec = await makeCastingSpec(specP);
  const { storeName } = spec;
  if (storeName) {
    return makeCosmjsFollower(spec, leaderOrMaker, options);
  }
  return makeSubscriptionFollower(spec);
};
