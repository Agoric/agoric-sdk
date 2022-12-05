/// <reference types="ses"/>

import { HandledPromise, E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { canBeDurable, vivifyFarClassKit } from '@agoric/vat-data';

import './types-ambient.js';

const { Fail, quote: q } = assert;

const sink = () => {};
const makeQuietRejection = reason => {
  const rejection = HandledPromise.reject(reason);
  void E.when(rejection, sink, sink);
  return harden(rejection);
};

/**
 * Asyncronously iterates over the contents of a PublicationList as they appear.
 * This iteration must drop parts of publication records that are no longer
 * needed so they can be garbage collected.
 *
 * @template T
 * @param {PublicationList<T>} pubList
 * @returns {AsyncIterator<T>}
 */
const makeEachIterator = pubList => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return Far('EachIterator', {
    next: () => {
      const resultP = E.get(pubList).head;
      pubList = E.get(pubList).tail;
      // We expect the tail to be the "cannot read past end" error at the end
      // of the happy path.
      // Since we are wrapping that error with eventual send, we sink the
      // rejection here too so it doesn't become an invalid unhandled rejection
      // later.
      void E.when(pubList, sink, sink);
      return resultP;
    },
  });
};

/**
 * Given a local or remote subscriber, returns a local AsyncIterable which
 * provides "prefix lossy" iterations of the underlying PublicationList.
 * By "prefix lossy", we mean that you may miss everything published before
 * you ask the returned iterable for an iterator. But the returned iterator
 * will enumerate each thing published from that iterator's starting point.
 *
 * If the underlying PublicationList is terminated, that terminal value will be
 * reported losslessly.
 *
 * @template T
 * @param {ERef<Subscriber<T>>} subscriber
 * @returns {AsyncIterable<T>}
 */
export const subscribeEach = subscriber => {
  const iterable = Far('EachIterable', {
    [Symbol.asyncIterator]: () => {
      const pubList = E(subscriber).subscribeAfter();
      return makeEachIterator(pubList);
    },
  });
  return iterable;
};
harden(subscribeEach);

/**
 * @template T
 * @param {ERef<Subscriber<T>>} subscriber
 * @returns {AsyncIterator<T>}
 */
const makeLatestIterator = subscriber => {
  let latestPublishCount;
  return Far('LatestIterator', {
    next: () => {
      const pubList = E(subscriber).subscribeAfter(latestPublishCount);
      // Without an onRejection, if pubList is a rejection, this will
      // propagate the rejection as it should.
      return E.when(pubList, ({ head, publishCount }) => {
        latestPublishCount = publishCount;
        return head;
      });
    },
  });
};

/**
 * Given a local or remote subscriber, returns a local AsyncIterable which
 * provides "lossy" iterations of the underlying PublicationList.
 * By "lossy", we mean that you may miss any published state if a more
 * recent published state can be reported instead.
 *
 * If the underlying PublicationList is terminated, that terminal value will be
 * reported losslessly.
 *
 * @template T
 * @param {ERef<Subscriber<T>>} subscriber
 * @returns {AsyncIterable<T>}
 */
export const subscribeLatest = subscriber => {
  const iterable = Far('LatestIterable', {
    [Symbol.asyncIterator]: () => makeLatestIterator(subscriber),
  });
  return iterable;
};
harden(subscribeLatest);

export const PublisherI = M.interface('Publisher', {
  publish: M.call(M.any()).returns(),
  finish: M.call(M.any()).returns(),
  fail: M.call(M.any()).returns(),
});
export const SubscriberI = M.interface('Subscriber', {
  subscribeAfter: M.call().optional(M.bigint()).returns(M.promise()),
});
export const publishKitIKit = harden({
  publisher: PublisherI,
  subscriber: SubscriberI,
});

/**
 * Makes a `{ publisher, subscriber }` pair for doing efficient
 * distributed pub/sub supporting both "each" and "latest" iteration
 * of published values.
 *
 * @template T
 * @returns {PublishKit<T>}
 */
export const makePublishKit = () => {
  /** @type {Promise<PublicationRecord<T>>} */
  let tailP;
  /** @type {undefined | ((value: ERef<PublicationRecord<T>>) => void)} */
  let tailR;
  ({ promise: tailP, resolve: tailR } = makePromiseKit());

  let currentPublishCount = 0n;
  let currentP = tailP;
  const advanceCurrent = (done, value, rejection) => {
    if (tailR === undefined) {
      throw new Error('Cannot update state after termination.');
    }

    currentPublishCount += 1n;
    currentP = tailP;
    const resolveCurrent = tailR;

    if (done) {
      tailP = makeQuietRejection(
        new Error('Cannot read past end of iteration.'),
      );
      tailR = undefined;
    } else {
      ({ promise: tailP, resolve: tailR } = makePromiseKit());
    }

    if (rejection) {
      resolveCurrent(rejection);
    } else {
      resolveCurrent(
        harden({
          head: { value, done },
          publishCount: currentPublishCount,
          tail: tailP,
        }),
      );
    }
  };

  /**
   * @template T
   * @type {Subscriber<T>}
   */
  const subscriber = Far('Subscriber', {
    subscribeAfter: (publishCount = -1n) => {
      assert.typeof(publishCount, 'bigint');
      if (publishCount === currentPublishCount) {
        return tailP;
      } else if (publishCount < currentPublishCount) {
        return currentP;
      } else {
        throw new Error(
          'subscribeAfter argument must be a previously-issued publishCount.',
        );
      }
    },
  });

  /** @type {Publisher<T>} */
  const publisher = Far('Publisher', {
    publish: value => {
      advanceCurrent(false, value);
    },
    finish: finalValue => {
      advanceCurrent(true, finalValue);
    },
    fail: reason => {
      advanceCurrent(true, undefined, makeQuietRejection(reason));
    },
  });
  return harden({ publisher, subscriber });
};
harden(makePublishKit);

// TODO: Move durable publish kit to a new file?

/**
 * @typedef {ReturnType<typeof initDurablePublishKitState>} DurablePublishKitState
 */

/**
 * @param {DurablePublishKitOptions} [options]
 */
const initDurablePublishKitState = (options = {}) => {
  const { valueDurability = 'mandatory' } = options;
  assert.equal(valueDurability, 'mandatory');
  return {
    // configuration
    valueDurability,

    // lifecycle progress
    publishCount: 0n,
    status: 'live', // | 'finished' | 'failed'

    // persisted result data
    // Note that in addition to non-terminal values from `publish`,
    // value also holds the terminal value from `finish` or `fail`.
    hasValue: false,
    value: undefined,
  };
};

/** @type {WeakMap<object, {currentP, tailP, tailR}>} */
const durablePublishKitEphemeralData = new WeakMap();

// XXX Does state actually work as a WeakMap key?
/**
 * Returns the current/next-result promises and next-result resolver
 * associated with a given state object backing a durable publish kit.
 * They are lost on upgrade, but recreated on-demand.
 * Such recreation preserves the value in (but not the identity of) the
 * current { value, done } result when possible, which is always the
 * case when that value is terminal (i.e., from `finish` or `fail`) or
 * when the durable publish kit is configured with
 * `valueDurability: 'mandatory'`.
 *
 * @param {DurablePublishKitState} state
 */
const provideDurablePublishKitEphemeralData = state => {
  const foundData = durablePublishKitEphemeralData.get(state);
  if (foundData) {
    return foundData;
  }
  const { status, publishCount } = state;
  /** @type {object} */
  let newData;
  if (status === 'failed') {
    newData = {
      currentP: makeQuietRejection(state.value),
      tailP: makeQuietRejection(
        new Error('Cannot read past end of iteration.'),
      ),
      tailR: undefined,
    };
  } else if (status === 'finished') {
    const tailP = makeQuietRejection(
      new Error('Cannot read past end of iteration.'),
    );
    newData = {
      currentP: HandledPromise.resolve(
        harden({
          head: { value: state.value, done: true },
          publishCount,
          tail: tailP,
        }),
      ),
      tailP,
      tailR: undefined,
    };
  } else if (status === 'live') {
    const { promise: tailP, resolve: tailR } = makePromiseKit();
    void E.when(tailP, sink, sink);
    newData = {
      currentP: state.hasValue
        ? HandledPromise.resolve(
            harden({
              head: { value: state.value, done: false },
              publishCount,
              tail: tailP,
            }),
          )
        : tailP,
      tailP,
      tailR,
    };
  } else {
    Fail`Invalid durable promise kit status: ${q(status)}`;
  }
  durablePublishKitEphemeralData.set(state, harden(newData));
  return newData;
};

/**
 * Extends the sequence of results.
 *
 * @param {DurablePublishKitState} state
 * @param {boolean} done
 * @param {any} value
 * @param {any} [rejection]
 */
const advanceDurablePublishKit = (state, done, value, rejection) => {
  const { valueDurability, status } = state;
  if (status !== 'live') {
    throw new Error('Cannot update state after termination.');
  }
  if (done || valueDurability === 'mandatory') {
    canBeDurable(value) || Fail`Cannot accept non-durable value: ${value}`;
    canBeDurable(rejection) ||
      Fail`Cannot accept non-durable rejection: ${rejection}`;
  }
  const { tailP: currentP, tailR: resolveCurrent } =
    provideDurablePublishKitEphemeralData(state);

  state.publishCount += 1n;
  const publishCount = state.publishCount;
  let tailP;
  let tailR;

  if (done) {
    state.status = rejection ? 'failed' : 'finished';
    tailP = makeQuietRejection(new Error('Cannot read past end of iteration.'));
    tailR = undefined;
  } else {
    ({ promise: tailP, resolve: tailR } = makePromiseKit());
    void E.when(tailP, sink, sink);
  }
  durablePublishKitEphemeralData.set(state, harden({ currentP, tailP, tailR }));

  if (rejection) {
    state.hasValue = true;
    state.value = rejection;
    resolveCurrent(rejection);
  } else {
    // Persist a terminal value, or a non-terminal value
    // if configured as 'mandatory' or 'opportunistic'.
    if (done || (valueDurability !== 'ignored' && canBeDurable(value))) {
      state.hasValue = true;
      state.value = value;
    } else {
      state.hasValue = false;
      state.value = undefined;
    }

    resolveCurrent(
      harden({
        head: { value, done },
        publishCount,
        tail: tailP,
      }),
    );
  }
};

/**
 * @param {import('../../vat-data/src/types.js').Baggage} baggage
 * @param {string} kindName
 */
export const vivifyDurablePublishKit = (baggage, kindName) => {
  /**
   * @returns {() => PublishKit<*>}
   */
  return vivifyFarClassKit(
    baggage,
    kindName,
    publishKitIKit,
    initDurablePublishKitState,
    {
      // The publisher facet of a durable publish kit
      // accepts new values.
      publisher: {
        publish(value) {
          advanceDurablePublishKit(this.state, false, value);
        },
        finish(finalValue) {
          advanceDurablePublishKit(this.state, true, finalValue);
        },
        fail(reason) {
          const rejection = makeQuietRejection(reason);
          advanceDurablePublishKit(this.state, true, undefined, rejection);
        },
      },

      // The subscriber facet of a durable publish kit
      // propagates values.
      subscriber: {
        subscribeAfter(publishCount = -1n) {
          const { state } = this;
          const { publishCount: currentPublishCount } = state;
          const { currentP, tailP } =
            provideDurablePublishKitEphemeralData(state);
          if (publishCount === currentPublishCount) {
            return tailP;
          } else if (publishCount < currentPublishCount) {
            return currentP;
          } else {
            throw new Error(
              'subscribeAfter argument must be a previously-issued publishCount.',
            );
          }
        },
      },
    },
  );
};
harden(vivifyDurablePublishKit);
