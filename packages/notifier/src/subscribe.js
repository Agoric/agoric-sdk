import { E, Far } from '@endo/far';

import '../src/types-ambient.js';

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
 * Asyncronously iterates over the contents of a PublicationList as they appear.
 * This iteration must drop parts of publication records that are no longer
 * needed so they can be garbage collected.
 *
 * @template T
 * @param {PublicationList<T>} pubList
 * @returns {AsyncIterableIterator<T, T>}
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
    [Symbol.asyncIterator]: () => makeEachIterator(pubList),
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
 * @returns {AsyncIterableIterator<T>}
 */
const makeLatestIterator = (topic, localUpdateCount) => {
  let myIterationResultP;
  return Far('LatestIterator', {
    [Symbol.asyncIterator]: () => makeLatestIterator(topic, localUpdateCount),
    next: () => {
      // In this adaptor, once `next()` is called and returns an
      // unresolved promise, `myIterationResultP`, and until
      // `myIterationResultP` is fulfilled with an
      // iteration result, further `next()` calls will return the same
      // `myIterationResultP` promise again without asking the notifier
      // for more updates. If there's already an unanswered ask in the
      // air, all further asks should just reuse the result of that one.
      //
      // This reuse behavior is only needed for code that uses the async
      // iterator protocol explicitly. When this async iterator is
      // consumed by a for/await/of loop, `next()` will only be called
      // after the promise for the previous iteration result has
      // fulfilled. If it fulfills with `done: true`, the for/await/of
      // loop will never call `next()` again.
      //
      // See
      // https://2ality.com/2016/10/asynchronous-iteration.html#queuing-next()-invocations
      // for an explicit use that sends `next()` without waiting.
      if (myIterationResultP) {
        return myIterationResultP;
      }

      myIterationResultP = E(topic)
        .getUpdateSince(localUpdateCount)
        .then(({ value, updateCount }) => {
          localUpdateCount = updateCount;
          const done = localUpdateCount === undefined;
          if (!done) {
            // Once the outstanding question has been answered, stop
            // using that answer, so any further `next()` questions
            // cause a new `getUpdateSince` request.
            //
            // But only if more answers are expected.  Once the topic
            // is `done`, that was the last answer so reuse it forever.
            myIterationResultP = undefined;
          }
          return harden({ value, done });
        });
      return myIterationResultP;
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
 * @param {ERef<LatestTopic<T>>} topic
 */
export const subscribeLatest = topic => {
  const iterable = Far('LatestIterable', {
    [Symbol.asyncIterator]: () => makeLatestIterator(topic),
  });
  return iterable;
};
harden(subscribeLatest);
