// @ts-check
import { E, Far } from '@endo/far';
import { makeNotifierKit } from '@agoric/notifier';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { QueryClient } from '@cosmjs/stargate';

import { makeAsyncIterableFromNotifier, iterateLatest } from './iterable.js';
import { DEFAULT_DECODER, DEFAULT_UNSERIALIZER } from './defaults.js';
import { makeCastingSpec } from './casting-spec.js';

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
 * @type {Record<Required<import('./types').FollowerOptions>['integrity'], QueryVerifier>}
 */
export const integrityToQueryVerifier = harden({
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
 * @param {ERef<import('./types').Leader>} leader
 * @param {import('./types').CastingSpecTemplate} specTemplate
 * @param {import('./types').FollowerOptions} options
 * @returns {Follower<FollowerElement<T>>}
 */
export const makeFollower = (leader, specTemplate, options = {}) => {
  const {
    decode = DEFAULT_DECODER,
    unserializer = DEFAULT_UNSERIALIZER,
    integrity = 'optimistic',
    crasher = null,
    clientParams,
  } = options;

  /**
   * @returns {Promise<import('./types').CastingSpec>}
   */
  const expandSpecTemplate = async () => {
    if (typeof specTemplate !== 'function') {
      return specTemplate;
    }

    const fullClientParams = { ...clientParams };
    /** @type {Required<import('./types.js').FollowerOptions>} */
    const fullOpts = {
      decode,
      unserializer,
      integrity,
      crasher,
      clientParams: fullClientParams,
    };
    if (clientParams) {
      // TODO: Update the client parameters with address.
      const { address: desiredAddress } = fullClientParams;
      assert.typeof(
        desiredAddress,
        'string',
        X`clientParams.address must be a string; got ${desiredAddress}`,
      );
    }
    harden(fullOpts);

    const spec = await E(specTemplate)(fullOpts);
    return makeCastingSpec(spec);
  };

  const specP = expandSpecTemplate();

  /** @type {QueryVerifier} */
  const queryVerifier = integrityToQueryVerifier[integrity];
  assert(queryVerifier, X`unrecognized follower integrity mode ${integrity}`);

  /** @type {Map<string, QueryClient>} */
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
   * @param {(storeName: string) => string} makeQueryPath
   */
  const makeQuerier =
    (method, makeQueryPath) =>
    /**
     * @param {number} [height]
     * @returns {Promise<Uint8Array>}
     */
    async height => {
      const {
        dataPrefixBytes = new Uint8Array(),
        storeSubkey,
        storeName,
      } = await specP;
      const queryPath = makeQueryPath(storeName);
      const values = await E(leader).mapEndpoints(async endpoint => {
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

  const getProvenValueAtHeight = makeQuerier(
    'queryVerified',
    storeName => storeName,
  );
  const getUnprovenValueAtHeight = makeQuerier(
    'queryUnverified',
    storeName => `store/${storeName}/key`,
  );

  // Enable the periodic fetch.
  /** @type {Follower<FollowerElement<T>>} */
  return Far('chain follower', {
    getLatestIterable: () => {
      /** @type {NotifierRecord<FollowerElement<T>>} */
      const { updater, notifier } = makeNotifierKit();
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
      const retryOrFail = err => {
        E(leader)
          .retry(err, attempt)
          .catch(e => {
            fail(e);
            throw e;
          });
        attempt += 1;
      };

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
      const queryAndUpdateOnce = async allegedChange => {
        const committer = prepareUpdateInOrder();

        // Make an unproven query if we have no alleged value.
        const { values: allegedValues, blockHeight: allegedBlockHeight } =
          allegedChange;
        const getAllegedValue =
          allegedValues.length > 0
            ? () => Promise.resolve(allegedValues[allegedValues.length - 1])
            : () => getUnprovenValueAtHeight(allegedBlockHeight);
        const getProvenValue = () => getProvenValueAtHeight(allegedBlockHeight);

        const wrappedCrash = e => {
          let parsedError;
          const { message } = e || {};
          if (message) {
            try {
              parsedError = JSON.parse(message);
            } catch (e2) {
              if (!(e2 instanceof SyntaxError)) {
                throw e2;
              }
            }
          }
          const { code } = parsedError || {};
          if (Number.isSafeInteger(code)) {
            return e;
          }
          return crash(e);
        };
        const ret = await queryVerifier(
          getProvenValue,
          wrappedCrash,
          getAllegedValue,
        );
        if (ret instanceof Error) {
          assert.note(
            ret,
            X`Swallowing JSON-RPC error error while querying ${allegedValues} ${allegedBlockHeight}`,
          );
          return;
        }

        const buf = ret;
        if (buf.length === 0) {
          // No data.  Just wait until the next event.
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
        const data = decode(buf);
        if (!unserializer) {
          /** @type {T} */
          const value = data;
          committer.commit({ value });
          return;
        }
        const value = await E(unserializer).unserialize(data);
        if (!committer.isValid()) {
          return;
        }
        committer.commit({ value });
      };

      const bootUp = async () => {
        const castingSpec = await specP;
        const changeFollowerP = E(leader).watchCasting(castingSpec);
        const queryWhenKeyChanges = async () => {
          for await (const allegedChange of iterateLatest(changeFollowerP)) {
            if (finished) {
              return;
            }
            harden(allegedChange);
            await queryAndUpdateOnce(allegedChange).catch(retryOrFail);
          }
        };
        queryAndUpdateOnce({ values: [], castingSpec }).catch(retryOrFail);
        queryWhenKeyChanges().catch(fail);
      };
      bootUp().catch(fail);

      return makeAsyncIterableFromNotifier(notifier);
    },
  });
};
