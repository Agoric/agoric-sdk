/// <reference types="ses"/>

import { makePromiseKit } from '@endo/promise-kit';
import { E } from '@endo/far';
import { M } from '@agoric/store';

import './types-ambient.js';
import { heapPlace, makeDurablePlace } from './fake-place.js';

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
 * @returns {PublishKitState}
 */
const initPublishKitState = () => {
  return {
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
/** @typedef {Publisher<*>} PublishKitEphemeralKey */
/**
 * @param {PublishKit<*>} facets
 * @returns {PublishKitEphemeralKey}
 */
const getEphemeralKey = facets => facets.publisher;

/** @type {WeakMap<PublishKitEphemeralKey, {currentP, tailP, tailR}>} */
const publishKitEphemeralData = new WeakMap();

/**
 * Returns the current/next-result promises and next-result resolver
 * associated with a given publish kit.
 * They are lost on upgrade, but recreated on-demand.
 * Such recreation preserves the value in (but not the identity of) the
 * current { value, done } result when possible.
 *
 * @template T
 * @param {PublishKitState} state
 * @param {PublishKit<T>} facets
 */
const providePublishKitEphemeralData = (state, facets) => {
  const ephemeralKey = getEphemeralKey(facets);
  const foundData = publishKitEphemeralData.get(ephemeralKey);
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
    Fail`Invalid promise kit status: ${q(status)}`;
  }
  publishKitEphemeralData.set(ephemeralKey, harden(newData));
  return newData;
};

/**
 * Extends the sequence of results.
 *
 * @param {import('./fake-place').Place} place
 * @param {{state: PublishKitState, facets: PublishKit<*>}} context
 * @param {boolean} done
 * @param {any} value
 * @param {any} [rejection]
 */
const advancePublishKit = (place, context, done, value, rejection) => {
  const { state, facets } = context;
  const { status } = state;
  if (status !== 'live') {
    throw new Error('Cannot update state after termination.');
  }
  if (done) {
    place.isValidExoState(value) || Fail`Invalid exo state value: ${value}`;
    place.isValidExoState(rejection) ||
      Fail`Invalid exo state rejection: ${rejection}`;
  }
  const { tailP: currentP, tailR: resolveCurrent } =
    providePublishKitEphemeralData(state, facets);

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
  publishKitEphemeralData.set(
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
    if (done || place.isValidExoState(value)) {
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
 * @param {import('./fake-place').Place} place
 * @param {object} [options]
 * @param {string} [options.kindName='PublishKit']
 * @param {Record<string, InterfaceGuard>} [options.interfaceGuardKit]
 */
export const placePublishKit = (
  place,
  { interfaceGuardKit = publishKitIKit, kindName = 'PublishKit' } = {},
) => {
  const makeUpdateRecord = weakMemoizeUnary(translatePublicationRecord);

  /**
   * Makes a `{ publisher, subscriber }` pair for doing efficient
   * distributed pub/sub supporting both "each" and "latest" iteration
   * of published values.
   *
   * @type {<T>(...args: Parameters<typeof initPublishKitState>) => PublishKit<T>}
   */
  const maker = place.exoClassKit(
    kindName,
    interfaceGuardKit,
    initPublishKitState,
    {
      // The publisher facet of a publish kit accepts new values.
      publisher: {
        publish(value) {
          advancePublishKit(place, this, false, value);
        },
        finish(finalValue) {
          advancePublishKit(place, this, true, finalValue);
        },
        fail(reason) {
          const rejection = makeQuietRejection(reason);
          advancePublishKit(place, this, true, undefined, rejection);
        },
      },

      // The subscriber facet of a publish kit propagates values.
      subscriber: {
        subscribeAfter(publishCount = -1n) {
          const { state, facets } = this;
          const { publishCount: currentPublishCount } = state;
          const { currentP, tailP } = providePublishKitEphemeralData(
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
          return (
            subscriber
              .subscribeAfter(updateCount)
              // We ensure we're at a fresh publication record in case they were the
              // first of a big batch.
              .then(() => subscriber.getUpdateSince())
          );
        },
      },
    },
  );
  return maker;
};
harden(placePublishKit);

export const SubscriberShape = M.remotable('Subscriber');

/**
 * @deprecated Use `placePublishKit(makeDurablePlace(baggage))` instead.
 * @param {import('../../vat-data/src/types.js').Baggage} baggage
 * @param {string} kindName
 */
export const prepareDurablePublishKit = (baggage, kindName) =>
  placePublishKit(makeDurablePlace(baggage), { kindName });
harden(prepareDurablePublishKit);

/**
 * In-memory publish kit, with no publisher interface pattern assertions.
 */
export const makePublishKit = placePublishKit(heapPlace, {
  interfaceGuardKit: harden({
    publisher: M.interface('UnguardedPublisher', {
      /* eslint-disable no-underscore-dangle */
      publish: M.__NO_METHOD_GUARD__(),
      finish: M.__NO_METHOD_GUARD__(),
      fail: M.__NO_METHOD_GUARD__(),
    }),
    subscriber: SubscriberI,
  }),
});
harden(makePublishKit);
