import { E, Far } from '@endo/far';

import './types-ambient.js';

const sink = () => {};

/**
 * Create a near iterable that corresponds to a potentially far one.
 *
 * @template T
 * @param {ERef<AsyncIterable<T>>} itP
 * @returns {AsyncIterable<T>}
 */
export const subscribe = itP =>
  Far('AsyncIterable', {
    [Symbol.asyncIterator]: () => {
      const it = E(itP)[Symbol.asyncIterator]();
      return Far('AsyncIterator', {
        next: async () => E(it).next(),
      });
    },
  });

/**
 * Asyncronously iterates over the contents of a PublicationRecord chain as they
 * appear.  This iteration must drop parts of publication records that are no
 * longer needed so they can be garbage collected.
 *
 * @template T
 * @param {ERef<PublicationRecord<T>>} pubList
 * @returns {ForkableAsyncIterator<T, T>}
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
    fork: () => makeEachIterator(pubList),
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
 * @param {ERef<EachTopic<T>>} topic
 * @returns {AsyncIterable<T>}
 */
export const subscribeEach = topic => {
  const iterable = Far('EachIterable', {
    [Symbol.asyncIterator]: () => {
      const pubList = E(topic).subscribeAfter();
      return makeEachIterator(pubList);
    },
  });
  return iterable;
};
harden(subscribeEach);

/**
 * @template T
 * @param {ERef<LatestTopic<T>>} topic
 * @param {bigint} [localUpdateCount]
 * @param {IteratorReturnResult<T>} [terminalResult]
 * @returns {ForkableAsyncIterator<T, T>}
 */
const cloneLatestIterator = (topic, localUpdateCount, terminalResult) => {
  let mutex = Promise.resolve();

  /**
   * Request the next update record from the topic, updating our local state,
   * and convert it to an iterator result.
   *
   * @returns {Promise<IteratorResult<T, T>>}
   */
  const maybeRequestNextResult = async () => {
    if (terminalResult) {
      // We've reached the end of the topic, just keep returning the last result
      // without further requests.
      return terminalResult;
    }

    // Send the next request now, skipping past intermediate updates.
    const { value, updateCount } = await E(topic).getUpdateSince(
      localUpdateCount,
    );
    // Make sure the next request is for a fresher value.
    localUpdateCount = updateCount;

    // Make an IteratorResult.
    if (updateCount === undefined) {
      terminalResult = harden({ done: true, value });
      return terminalResult;
    }
    return harden({ done: false, value });
  };

  return Far('LatestIterator', {
    fork: () => cloneLatestIterator(topic, localUpdateCount, terminalResult),
    next: async () => {
      // In this adaptor, once `next()` is called and returns an unresolved
      // promise, further `next()` calls will also return unresolved promises
      // but each call will not trigger another `topic` request until the prior
      // one has settled.
      //
      // This linear queueing behavior is only needed for code that uses the
      // async iterator protocol explicitly. When this async iterator is
      // consumed by a for/await/of loop, `next()` will only be called after the
      // promise for the previous iteration result has fulfilled. If it fulfills
      // with `done: true`, the for/await/of loop will never call `next()`
      // again.
      //
      // See
      // https://2ality.com/2016/10/asynchronous-iteration.html#queuing-next()-invocations
      // for an explicit use that sends `next()` without waiting.

      if (terminalResult) {
        // We've reached the end of the topic, just keep returning the last
        // result.
        return terminalResult;
      }

      // BEGIN CRITICAL SECTION - synchronously enqueue and reassign `mutex`
      //
      // Use `mutex` to ensure that we have no more than a single request in
      // flight.
      const nextResult = mutex.then(maybeRequestNextResult);
      mutex = nextResult.then(sink, sink);
      // END CRITICAL SECTION

      return nextResult;
    },
  });
};

/**
 * @template T
 * @param {ERef<LatestTopic<T>>} topic
 * @returns {ForkableAsyncIterator<T, T>}
 */
const makeLatestIterator = topic => cloneLatestIterator(topic);

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
 * @param {ERef<LatestTopic<T>>} topic
 * @returns {AsyncIterable<T>}
 */
export const subscribeLatest = topic => {
  const iterable = Far('LatestIterable', {
    [Symbol.asyncIterator]: () => makeLatestIterator(topic),
  });
  return iterable;
};
harden(subscribeLatest);
