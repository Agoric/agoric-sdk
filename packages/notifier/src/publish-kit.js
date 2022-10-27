// @ts-check
/// <reference types="ses"/>

import { HandledPromise, E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import { Far } from '@endo/marshal';

import './types.js';

const sink = () => {};
const makeQuietRejection = reason => {
  const rejection = HandledPromise.reject(reason);
  rejection.catch(sink);
  return rejection;
};

/**
 * Asyncronously iterates over the contents of a PublicationList as it appears.
 * As it proceeds, it must drop the parts of the list it no longer needs.
 * Thus, if no one else is holding on to those, it can be garbage collected.
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
      const rejection = makeQuietRejection(reason);
      advanceCurrent(true, undefined, rejection);
    },
  });
  return harden({ publisher, subscriber });
};
harden(makePublishKit);
