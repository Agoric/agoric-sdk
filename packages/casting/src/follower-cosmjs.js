// @ts-check
import { E, Far } from '@endo/far';
import { makeNotifierKit, makeSubscriptionKit } from '@agoric/notifier';
import * as tendermintRpcStar from '@cosmjs/tendermint-rpc';
import * as stargateStar from '@cosmjs/stargate';

import {
  iterateLatest,
  makeSubscriptionIterable,
  makeNotifierIterable,
} from './iterable.js';
import { MAKE_DEFAULT_DECODER, MAKE_DEFAULT_UNSERIALIZER } from './defaults.js';
import { makeCastingSpec } from './casting-spec.js';
import { makeLeader as defaultMakeLeader } from './leader-netconfig.js';

const { QueryClient } = stargateStar;
const { Tendermint34Client } = tendermintRpcStar;
const { details: X } = assert;

/** @template T @typedef {import('./types.js').FollowerElement<T>} FollowerElement */
/** @template T @typedef {import('./types.js').Follower<T>} Follower */

/**
 * @template T
 * @param {Iterable<T>} values
 * @returns {T}
 */
const collectSingle = values => {
  /** @type {T[]} */
  const head = [];
  let count = 0;
  for (const value of values) {
    count += 1;
    if (count === 1) {
      head.push(value);
    } else {
      assert.fail(`expected single value, got at least ${count}`);
    }
  }

  assert.equal(head.length, 1, 'expected single value');
  return head[0];
};

/**
 * @callback QueryVerifier
 * @param {() => Promise<Uint8Array>} getProvenValue
 * @param {(reason?: unknown) => void} crash
 * @param {() => Promise<Uint8Array>} getAllegedValue
 */

/**
 * @type {Record<Required<import('./types').FollowerOptions>['proof'], QueryVerifier>}
 */
export const proofToQueryVerifier = harden({
  strict: async (getProvenValue, crash, _getAllegedValue) => {
    // Just ignore the alleged value.
    // Crash hard if we can't prove.
    return getProvenValue().catch(crash);
  },
  none: async (_getProvenValue, _crash, getAllegedValue) => {
    // Fast and loose.
    return getAllegedValue();
  },
  optimistic: async (getProvenValue, crash, getAllegedValue) => {
    const allegedValue = await getAllegedValue();
    // Prove later, since it may take time we say we can't afford.
    getProvenValue().then(provenValue => {
      if (provenValue.length === allegedValue.length) {
        if (provenValue.every((proven, i) => proven === allegedValue[i])) {
          return;
        }
      }
      crash(
        assert.error(
          X`Alleged value ${allegedValue} did not match proof ${provenValue}`,
        ),
      );
    }, crash);

    // Speculate that we got the right value.
    return allegedValue;
  },
});

/**
 * @template T
 * @param {any} sourceP
 * @param {import('./types').LeaderOrMaker} [leaderOrMaker]
 * @param {import('./types').FollowerOptions} [options]
 * @returns {Follower<FollowerElement<T>>}
 */
export const makeCosmjsFollower = (
  sourceP,
  leaderOrMaker = defaultMakeLeader,
  options = {},
) => {
  const {
    decode = MAKE_DEFAULT_DECODER(),
    unserializer = MAKE_DEFAULT_UNSERIALIZER(),
    proof = 'optimistic',
    crasher = null,
  } = options;

  /** @type {QueryVerifier} */
  const queryVerifier = proofToQueryVerifier[proof];
  assert(queryVerifier, X`unrecognized follower proof mode ${proof}`);

  const where = 'CosmJS follower';
  const castingSpecP = makeCastingSpec(sourceP);

  const leader =
    typeof leaderOrMaker === 'function' ? leaderOrMaker() : leaderOrMaker;

  /** @type {Map<string, import('@cosmjs/stargate').QueryClient>} */
  const endpointToQueryClient = new Map();

  /**
   * @param {string} endpoint
   */
  const getOrCreateQueryClient = async endpoint => {
    if (endpointToQueryClient.has(endpoint)) {
      // Cache hit.
      const queryClient = endpointToQueryClient.get(endpoint);
      assert(queryClient);
      return queryClient;
    }
    // Create a new client.  They retry automatically.
    const rpcClient = await Tendermint34Client.connect(endpoint);
    const queryClient = QueryClient.withExtensions(rpcClient);
    endpointToQueryClient.set(endpoint, queryClient);
    return queryClient;
  };

  /**
   * @param {'queryVerified' | 'queryUnverified'} method
   */
  const makeQuerier =
    method =>
    /**
     * @param {number} [height]
     * @returns {Promise<Uint8Array>}
     */
    async height => {
      const {
        storeName,
        storeSubkey,
        dataPrefixBytes = new Uint8Array(),
      } = await castingSpecP;
      assert.typeof(storeName, 'string');
      assert(storeSubkey);
      let queryPath;
      switch (method) {
        case 'queryVerified': {
          queryPath = storeName;
          break;
        }
        case 'queryUnverified': {
          queryPath = `store/${storeName}/key`;
          break;
        }
        default: {
          assert.fail(X`unrecognized method ${method}`);
        }
      }
      const values = await E(leader).mapEndpoints(where, async endpoint => {
        const queryClient = await getOrCreateQueryClient(endpoint);
        return E(queryClient)
          [method](queryPath, storeSubkey, height)
          .then(
            result => {
              return { result, error: null };
            },
            error => {
              return { result: null, error };
            },
          );
      });
      const { result, error } = collectSingle(values);
      if (error !== null) {
        throw error;
      }
      assert(result);

      if (result.length === 0) {
        // No data.
        return result;
      }

      // Handle the data prefix if any.
      assert(
        result.length >= dataPrefixBytes.length,
        X`result too short for data prefix ${dataPrefixBytes}`,
      );
      assert(
        dataPrefixBytes.every((v, i) => v === result[i]),
        X`${result} doesn't start with data prefix ${dataPrefixBytes}`,
      );
      return result.slice(dataPrefixBytes.length);
    };

  const getProvenValueAtHeight = makeQuerier('queryVerified');
  const getUnprovenValueAtHeight = makeQuerier('queryUnverified');

  /**
   * @param {IterationObserver<FollowerElement<T>>} updater
   * @param {AsyncIterable<FollowerElement<T>>} iterable
   */
  const getIterable = async (updater, iterable) => {
    let finished = false;

    const fail = err => {
      finished = true;
      updater.fail(err);
      return false;
    };

    const crash = err => {
      fail(err);
      if (crasher) {
        E(crasher)
          .crash(`PROOF VERIFICATION FAILURE; crashing follower`, err)
          .catch(e => assert(false, X`crashing follower failed: ${e}`));
      } else {
        console.error(`PROOF VERIFICATION FAILURE; crashing follower`, err);
      }
    };

    let attempt = 0;
    let retrying;

    /**
     * @param {import('./types.js').CastingChange} castingChange
     * @returns {Promise<void>}
     */
    const queryAndUpdateOnce = castingChange =>
      new Promise((resolve, reject) => {
        const retry = async err => {
          attempt += 1;
          if (!retrying) {
            retrying = E(leader)
              .retry(where, err, attempt)
              .then(() => (retrying = null));
          }
          await retrying;
          await E(leader).jitter(where);

          // eslint-disable-next-line no-use-before-define
          tryQueryAndUpdate(castingChange).then(success, retryOrFail);
        };

        const success = fulfillment => {
          attempt = 0;
          resolve(fulfillment);
        };

        const retryOrFail = err => {
          retry(err).catch(e => {
            reject(e);
            fail(e);
          });
        };

        // eslint-disable-next-line no-use-before-define
        tryQueryAndUpdate(castingChange).then(success, retryOrFail);
      });

    /**
     * These semantics are to ensure that later queries are not committed
     * ahead of earlier ones.
     *
     * @template T
     * @param {(...args: T[]) => void} commitAction
     */
    const makePrepareInOrder = commitAction => {
      let lastPrepareTicket = 0n;
      let lastCommitTicket = 0n;

      const prepareInOrder = () => {
        lastPrepareTicket += 1n;
        const ticket = lastPrepareTicket;
        assert(ticket > lastCommitTicket);
        const committer = Far('committer', {
          isValid: () => ticket > lastCommitTicket,
          /**
           * @type {(...args: T[]) => void}
           */
          commit: (...args) => {
            assert(committer.isValid());
            lastCommitTicket = ticket;
            commitAction(...args);
          },
        });
        return committer;
      };
      return prepareInOrder;
    };

    const prepareUpdateInOrder = makePrepareInOrder(updater.updateState);

    /** @type {Uint8Array} */
    let lastBuf;

    /**
     * @param {import('./types').CastingChange} allegedChange
     */
    const tryQueryAndUpdate = async allegedChange => {
      let committer = prepareUpdateInOrder();

      // Make an unproven query if we have no alleged value.
      const { values: allegedValues, blockHeight: allegedBlockHeight } =
        allegedChange;
      const getAllegedValue =
        allegedValues.length > 0
          ? () => Promise.resolve(allegedValues[allegedValues.length - 1])
          : () => getUnprovenValueAtHeight(allegedBlockHeight);
      const getProvenValue = () => getProvenValueAtHeight(allegedBlockHeight);

      const buf = await queryVerifier(getProvenValue, crash, getAllegedValue);
      if (buf.length === 0) {
        fail(Error('No query results'));
        return;
      }
      attempt = 0;
      if (!committer.isValid()) {
        return;
      }
      if (lastBuf) {
        if (buf.length === lastBuf.length) {
          if (buf.every((v, i) => v === lastBuf[i])) {
            // Duplicate!
            return;
          }
        }
      }
      lastBuf = buf;
      let streamCell = decode(buf);
      // Upgrade a naked value to a JSON stream cell if necessary.
      if (!streamCell.height || !streamCell.values) {
        streamCell = { values: [JSON.stringify(streamCell)] };
      }
      for (let i = 0; i < streamCell.values.length; i += 1) {
        const data = JSON.parse(streamCell.values[i]);
        const isLast = i + 1 === streamCell.values.length;
        const value = /** @type {T} */ (
          unserializer
            ? // eslint-disable-next-line no-await-in-loop,@jessie.js/no-nested-await
              await E(unserializer).unserialize(data)
            : data
        );
        // QUESTION: How would reach a point where this `isValid()` fails,
        // and what is the proper handling?
        if (!unserializer || committer.isValid()) {
          committer.commit({ value });
          if (!isLast) {
            committer = prepareUpdateInOrder();
          }
        }
      }
    };

    const changeFollower = E(leader).watchCasting(castingSpecP);
    const queryWhenKeyChanges = async () => {
      // Initial query to get the first value from the store.
      await queryAndUpdateOnce(harden({ values: [] }));
      if (finished) {
        return;
      }

      // Only query when there are changes reported.
      for await (const allegedChange of iterateLatest(changeFollower)) {
        if (finished) {
          return;
        }
        harden(allegedChange);
        // eslint-disable-next-line @jessie.js/no-nested-await
        await queryAndUpdateOnce(allegedChange);
      }
    };

    queryWhenKeyChanges().catch(fail);

    return iterable;
  };

  // Enable the periodic fetch.
  /** @type {Follower<FollowerElement<T>>} */
  return Far('chain follower', {
    getLatestIterable: () => {
      const { updater, notifier } = makeNotifierKit();
      return getIterable(updater, makeNotifierIterable(notifier));
    },
    getEachIterable: () => {
      const { subscription, publication } = makeSubscriptionKit();
      return getIterable(publication, makeSubscriptionIterable(subscription));
    },
  });
};
