// @ts-check
/**
 * @file A pure JavaScript async work pool utility that is compatible with but
 *   not dependent upon a hardened environment.
 */

const { isInteger } = Number;

const sink = () => {};

/**
 * @param {unknown} val
 * @returns {val is bigint | boolean | null | number | string | symbol | undefined}
 */
const isPrimitive = val =>
  !val || (typeof val !== 'object' && typeof val !== 'function');

/**
 * @template T
 * @typedef {object} PromiseKit
 * @property {(value: T | PromiseLike<T>) => void} resolve
 * @property {(reason: any) => void} reject
 * @property {Promise<T>} promise
 */

/**
 * @template T
 * @returns {PromiseKit<T>}
 */
const makePromiseKit = () => {
  /** @type {PromiseKit<T>['resolve']} */
  let resolve;
  /** @type {PromiseKit<T>['reject']} */
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // @ts-expect-error TS2454 use before assign
  return { promise, resolve, reject };
};

/**
 * Consume an async iterable with at most `capacity` unsettled results at any
 * given time, passing each input through `processInput` and providing [result,
 * index] pairs in settlement order. Source order can be recovered with consumer
 * code like:
 *
 *     const results = [];
 *     for (const [result, i] of makeWorkPool(...)) results[i] = result;
 *
 * or something more sophisticated to eagerly detect complete subsequences
 * immediately following a previous high-water mark for contiguous results.
 *
 * To support cases in which `processInput` is used only for side effects rather
 * than its return value, the returned AsyncGenerator has a promise-valued
 * `done` property that fulfills when all input has been processed (to `true` if
 * the source was exhausted or to `false` if iteration was aborted early),
 * regardless of how many final iteration results have been consumed:
 *
 *     await makeWorkPool(...).done;
 *
 * @template T
 * @template [U=T]
 * @template {'all' | 'allSettled'} [M='all']
 * @param {AsyncIterable<T> | Iterable<T>} source
 * @param {undefined
 *   | [capacity: number][0]
 *   | { capacity?: number; mode?: M }} config
 * @param {(
 *   input: Awaited<T>,
 *   index?: number,
 * ) => Promise<Awaited<U>> | Awaited<U>} [processInput]
 * @returns {AsyncGenerator<
 *   [
 *     M extends 'allSettled' ? PromiseSettledResult<Awaited<U>> : Awaited<U>,
 *     number,
 *   ]
 * > & { done: Promise<boolean>; then: () => never }}
 */
export const makeWorkPool = (
  source,
  config,
  processInput = x => /** @type {any} */ (x),
) => {
  // Validate arguments.
  if (isPrimitive(config)) config = { capacity: config, mode: undefined };
  const { capacity = 10, mode = 'all' } = config;
  if (!(capacity === Infinity || (isInteger(capacity) && capacity > 0))) {
    throw RangeError('capacity must be a positive integer');
  }
  if (mode !== 'all' && mode !== 'allSettled') {
    throw RangeError('mode must be "all" or "allSettled"');
  }

  // Normalize source into an `inputs` iterator.
  const makeInputs = source[Symbol.asyncIterator] || source[Symbol.iterator];
  const inputs =
    /** @type {AsyncIterator<Awaited<T>> | Iterator<Awaited<T>>} */ (
      Reflect.apply(makeInputs, source, [])
    );
  let inputsExhausted = false;
  let terminated = false;
  const doneKit = /** @type {PromiseKit<boolean>} */ (makePromiseKit());

  // Concurrently consume up to `capacity` inputs, pushing the result of
  // processing each into a linked chain of promises before consuming more.
  let nextIndex = 0;
  /**
   * @typedef {object} ResultNode
   * @property {Promise<ResultNode>} nextP
   * @property {number} index
   * @property {M extends 'allSettled'
   *   ? PromiseSettledResult<Awaited<U>>
   *   : Awaited<U>} result
   */
  const { promise: headP, ...headResolvers } =
    /** @type {PromiseKit<ResultNode>} */ (makePromiseKit());
  let { resolve: resolveCurrent, reject } = headResolvers;
  let inFlight = 0;
  const takeMoreInput = async () => {
    await null;
    while (inFlight < capacity && !inputsExhausted && !terminated) {
      inFlight += 1;
      const index = nextIndex;
      nextIndex += 1;
      /** @type {Promise<IteratorResult<Awaited<T>>>} */
      let iterResultP;
      try {
        iterResultP = Promise.resolve(inputs.next());
      } catch (err) {
        iterResultP = Promise.reject(err);
      }
      void iterResultP
        .then(async iterResult => {
          if (terminated) return;

          if (iterResult.done) {
            inFlight -= 1;
            inputsExhausted = true;
            void takeMoreInput();
            return;
          }

          // Process the input, propagating errors if mode is not "allSettled".
          await null;
          /** @type {PromiseSettledResult<Awaited<U>>} */
          let settlementDesc = { status: 'rejected', reason: undefined };
          try {
            const fulfillment = await processInput(iterResult.value, index);
            if (terminated) return;
            settlementDesc = { status: 'fulfilled', value: fulfillment };
          } catch (err) {
            if (terminated) return;
            if (mode !== 'allSettled') throw err;
            /** @type {PromiseRejectedResult} */ (settlementDesc).reason = err;
          }

          // Fulfill the current tail promise with a record that includes the
          // source index to which it corresponds and a reference to a new
          // [unsettled] successor (thereby extending the chain), then try to
          // consume more input.
          const { promise: nextP, ...nextResolvers } =
            /** @type {PromiseKit<ResultNode>} */ (makePromiseKit());
          // Analogous to `Promise.allSettled`, mode "allSettled" produces
          // { status, value, reason } PromiseSettledResult records.
          const result =
            mode === 'allSettled'
              ? settlementDesc
              : /** @type {PromiseFulfilledResult<Awaited<U>>} */ (
                  settlementDesc
                ).value;
          inFlight -= 1;
          void takeMoreInput();
          const untypedResult = /** @type {any} */ (result);
          resolveCurrent({ nextP, index, result: untypedResult });
          ({ resolve: resolveCurrent, reject } = nextResolvers);
        })
        .catch(err => {
          // End the chain with this rejection.
          terminated = true;
          reject(err);
          doneKit.reject(err);
          void (async () => inputs.throw?.(err))().catch(sink);
        });
    }
    if (inFlight <= 0 && inputsExhausted) {
      // @ts-expect-error This dummy signaling record conveys no result.
      resolveCurrent({ nextP: undefined, index: -1, result: undefined });
      doneKit.resolve(true);
    }
  };

  const results = (async function* generateResults(nextP) {
    await null;
    let exhausted = false;
    try {
      for (;;) {
        const { nextP: successor, index, result } = await nextP;
        nextP = successor;
        if (!successor) break;
        yield /** @type {[typeof result, number]} */ (
          Object.freeze([result, index])
        );
      }
      exhausted = true;
    } catch (err) {
      terminated = true;
      doneKit.reject(err);
      void (async () => inputs.throw?.(err))().catch(sink);
      throw err;
    } finally {
      const interrupted = !exhausted && !terminated;
      terminated = true;
      doneKit.resolve(false);
      if (interrupted) void (async () => inputs.return?.())().catch(sink);
    }
  })(headP);
  Object.defineProperty(results, 'done', {
    value: doneKit.promise,
    enumerable: true,
  });
  Object.defineProperty(results, 'then', {
    value: () => {
      throw Error('A work pool is not thenable; did you forget `.done`?');
    },
  });

  void takeMoreInput();

  // @ts-expect-error
  return Object.freeze(results);
};
