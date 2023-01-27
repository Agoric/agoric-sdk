/// <reference types="ses"/>

import { makePromiseKit } from '@endo/promise-kit';
import { E, Far } from '@endo/far';
import { M } from '@agoric/store';
import { canBeDurable, prepareExoClassKit } from '@agoric/vat-data';

import './types-ambient.js';

const { Fail, quote: q } = assert;

const sink = () => {};
const makeQuietRejection = reason => {
  const { promise: rejection, reject } = makePromiseKit();
  void E.when(rejection, sink, sink);
  reject(reason);
  return rejection;
};

export const PublisherI = M.interface('Publisher', {
  publish: M.call(M.any()).returns(),
  finish: M.call(M.any()).returns(),
  fail: M.call(M.any()).returns(),
});
export const UpdateCountI = M.or(M.bigint(), M.number(), M.undefined());
export const SubscriberI = M.interface('Subscriber', {
  subscribeAfter: M.call().optional(M.bigint()).returns(M.promise()),
  getUpdateSince: M.call().optional(UpdateCountI).returns(M.promise()),
});
export const publishKitIKit = harden({
  publisher: PublisherI,
  subscriber: SubscriberI,
});

/**
 * @template {object} Arg
 * @template Ret
 * @param {(arg: Arg) => Ret} fn
 * @returns {(arg: Arg) => Ret}
 */
const weakMemoizeUnary = fn => {
  const cache = new WeakMap();
  return arg => {
    /** @type {object} */
    const oarg = arg;
    if (cache.has(oarg)) {
      return cache.get(oarg);
    }
    const result = fn(arg);
    cache.set(oarg, result);
    return result;
  };
};

/**
 * @template T
 * @param {PublicationRecord<T>} record
 * @returns {UpdateRecord<T>}
 */
const translatePublicationRecord = record => {
  const {
    head: { value, done },
    publishCount,
  } = record;
  if (done) {
    // Final results have undefined updateCount.
    return harden({ value, updateCount: undefined });
  }
  return harden({ value, updateCount: publishCount });
};

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

  const makeUpdateRecord = weakMemoizeUnary(translatePublicationRecord);

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
    getUpdateSince: updateCount => {
      if (updateCount === undefined) {
        return subscriber.subscribeAfter().then(makeUpdateRecord);
      }
      updateCount = BigInt(updateCount);
      // We ensure we're at a fresh publication record in case they came in a
      // big batch.
      return subscriber
        .subscribeAfter(updateCount)
        .then(() => subscriber.getUpdateSince());
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
 * @param {object} [options]
 * @param {DurablePublishKitValueDurability & 'mandatory'} [options.valueDurability='mandatory']
 * @returns {DurablePublishKitState}
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

// We need the WeakMap key for a kit to be a vref-bearing object
// in its cohort, and have arbitrarily chosen the publisher facet.
/** @typedef {Publisher<*>} DurablePublishKitEphemeralKey */
/**
 * @param {PublishKit<*>} facets
 * @returns {DurablePublishKitEphemeralKey}
 */
const getEphemeralKey = facets => facets.publisher;

/** @type {WeakMap<DurablePublishKitEphemeralKey, {currentP, tailP, tailR}>} */
const durablePublishKitEphemeralData = new WeakMap();

/**
 * Returns the current/next-result promises and next-result resolver
 * associated with a given durable publish kit.
 * They are lost on upgrade, but recreated on-demand.
 * Such recreation preserves the value in (but not the identity of) the
 * current { value, done } result when possible, which is always the
 * case when that value is terminal (i.e., from `finish` or `fail`) or
 * when the durable publish kit is configured with
 * `valueDurability: 'mandatory'`.
 *
 * @param {DurablePublishKitState} state
 * @param {PublishKit<*>} facets
 */
const provideDurablePublishKitEphemeralData = (state, facets) => {
  const ephemeralKey = getEphemeralKey(facets);
  const foundData = durablePublishKitEphemeralData.get(ephemeralKey);
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
      currentP: E.resolve(
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
        ? E.resolve(
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
  durablePublishKitEphemeralData.set(ephemeralKey, harden(newData));
  return newData;
};

/**
 * Extends the sequence of results.
 *
 * @param {{state: DurablePublishKitState, facets: PublishKit<*>}} context
 * @param {boolean} done
 * @param {any} value
 * @param {any} [rejection]
 */
const advanceDurablePublishKit = (context, done, value, rejection) => {
  const { state, facets } = context;
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
    provideDurablePublishKitEphemeralData(state, facets);

  const publishCount = state.publishCount + 1n;
  state.publishCount = publishCount;
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
  durablePublishKitEphemeralData.set(
    getEphemeralKey(facets),
    harden({ currentP, tailP, tailR }),
  );

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
export const prepareDurablePublishKit = (baggage, kindName) => {
  // TODO: Investigate whether memoization is compatible with durability.
  const makeUpdateRecord = weakMemoizeUnary(translatePublicationRecord);

  /**
   * @returns {() => PublishKit<*>}
   */
  return prepareExoClassKit(
    baggage,
    kindName,
    publishKitIKit,
    initDurablePublishKitState,
    {
      // The publisher facet of a durable publish kit
      // accepts new values.
      publisher: {
        publish(value) {
          advanceDurablePublishKit(this, false, value);
        },
        finish(finalValue) {
          advanceDurablePublishKit(this, true, finalValue);
        },
        fail(reason) {
          const rejection = makeQuietRejection(reason);
          advanceDurablePublishKit(this, true, undefined, rejection);
        },
      },

      // The subscriber facet of a durable publish kit
      // propagates values.
      subscriber: {
        subscribeAfter(publishCount = -1n) {
          const { state, facets } = this;
          const { publishCount: currentPublishCount } = state;
          const { currentP, tailP } = provideDurablePublishKitEphemeralData(
            state,
            facets,
          );
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
        getUpdateSince(updateCount) {
          const {
            facets: { subscriber },
          } = this;
          if (updateCount === undefined) {
            return subscriber.subscribeAfter().then(makeUpdateRecord);
          }
          updateCount = BigInt(updateCount);
          return subscriber
            .subscribeAfter(updateCount)
            .then(() => subscriber.getUpdateSince());
        },
      },
    },
  );
};
harden(prepareDurablePublishKit);

export const SubscriberShape = M.remotable('Subscriber');
