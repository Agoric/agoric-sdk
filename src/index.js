/**
 * Create an EPromise class that supports eventual send (infix-bang) operations.
 * This is a class that extends the BasePromise class argument (which may be platform
 * Promises, or some other implementation).  Only the `new BasePromise(executor)`
 * constructor form is used directly by EPromise.
 *
 * Based heavily on nanoq https://github.com/drses/nanoq/blob/master/src/nanoq.js
 *
 * Original spec for the infix-bang desugaring:
 * https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency
 *
 * @param {typeof Promise} BasePromise ES6 Promise contstructor
 * @returns {typeof EPromise} EPromise class
 */
export default function makeEPromiseClass(BasePromise) {
  // A remoteRelay must additionally have an AWAIT_FAR method
  const localRelay = {
    GET(p, key) {
      return p.then(o => o[key]);
    },
    PUT(p, key, val) {
      return p.then(o => (o[key] = val));
    },
    DELETE(p, key) {
      return p.then(o => delete o[key]);
    },
    POST(p, optKey, args) {
      if (optKey === undefined || optKey === null) {
        return p.then(o => o(...args));
      }
      return p.then(o => o[optKey](...args));
    },
  };

  const relayToPromise = new WeakMap();
  const promiseToRelay = new WeakMap();

  function relay(p) {
    return promiseToRelay.get(p) || localRelay;
  }

  class EPromise extends BasePromise {
    static makeRemote(remoteRelay) {
      const promise = this.resolve(remoteRelay.AWAIT_FAR());
      relayToPromise.set(remoteRelay, promise);
      promiseToRelay.set(promise, remoteRelay);
      return promise;
    }

    static resolve(specimen) {
      return (
        relayToPromise.get(specimen) ||
        new EPromise(resolve => resolve(specimen))
      );
    }

    static reject(reason) {
      return new EPromise((_resolve, reject) => reject(reason));
    }

    get(key) {
      return relay(this).GET(this, key);
    }

    put(key, val) {
      return relay(this).PUT(this, key, val);
    }

    del(key) {
      return relay(this).DELETE(this, key);
    }

    post(optKey, args) {
      return relay(this).POST(this, optKey, args);
    }

    invoke(optKey, ...args) {
      return relay(this).POST(this, optKey, args);
    }

    fapply(args) {
      return relay(this).POST(this, undefined, args);
    }

    fcall(...args) {
      return relay(this).POST(this, undefined, args);
    }

    // ***********************************************************
    // The rest of these static methods ensure we use the correct
    // EPromise.resolve and EPromise.reject, no matter what the
    // implementation of the inherited BasePromise is.
    static all(iterable) {
      // eslint-disable-next-line no-use-before-define
      return combinePromises([], iterable, (res, item, index) => {
        // Reject if any reject.
        if (item.status === 'rejected') {
          throw item.reason;
        }

        // Add the resolved value to the array.
        res[index] = item.value;

        // Continue combining promise results.
        return { status: 'continue', result: res };
      });
    }

    static allSettled(iterable) {
      // eslint-disable-next-line no-use-before-define
      return combinePromises([], iterable, (res, item, index) => {
        // Add the reified promise result to the array.
        res[index] = item;

        // Continue combining promise results.
        return { status: 'continue', result: res };
      });
    }

    // TODO: Implement any(iterable) according to spec.
    // Also add it to the SES/Jessie whitelists.

    static race(iterable) {
      // Just return the first reified promise result, whether fulfilled or rejected.
      // eslint-disable-next-line no-use-before-define
      return combinePromises([], iterable, (_, item) => item);
    }
  }

  /**
   * Reduce-like helper function to support iterable values mapped to Promise.resolve,
   * and combine them asynchronously.
   *
   * The combiner may be called in any order, and the collection is not necessarily
   * done iterating by the time it's called.
   *
   * The notable difference from reduce is that the combiner gets a reified
   * settled promise as its `item` argument, and returns a combiner action
   * with a `status` field of "rejected", "fulfilled", or "continue".
   *
   * @param {*} initValue first value of result
   * @param {Iterable} iterable values to EPromise.resolve
   * @param {Combiner} combiner synchronously reduce each item
   * @returns {EPromise<*>}
   */
  function combinePromises(initValue, iterable, combiner) {
    let result = initValue;

    // We use the platform async keyword here to simplify
    // the executor function.
    return new EPromise(async (resolve, reject) => {
      // We start at 1 to prevent the iterator from resolving
      // the EPromise until the loop is complete and all items
      // have been reduced.
      let countDown = 1;
      let alreadySettled = false;

      function rejectOnce(e) {
        if (!alreadySettled) {
          alreadySettled = true;
          reject(e);
        }
      }

      function resolveOnce(value) {
        if (!alreadySettled) {
          alreadySettled = true;
          resolve(value);
        }
      }

      function doCountDown() {
        countDown -= 1;
        if (countDown === 0) {
          // Resolve the outer promise.
          resolveOnce(result);
        }
      }

      async function doCombine(mapped, index) {
        if (alreadySettled) {
          // Short-circuit out of here, since we already
          // rejected or resolved.
          return;
        }

        // Either update the result or throw an exception.
        const action = await combiner(result, mapped, index);
        switch (action.status) {
          case 'continue':
            // eslint-disable-next-line prefer-destructuring
            result = action.result;
            break;

          case 'rejected':
            rejectOnce(action.reason);
            break;

          case 'fulfilled':
            // Resolve the outer promise.
            result = action.value;
            resolveOnce(result);
            break;

          default:
            throw TypeError(`Not a valid combiner return value: ${action}`);
        }

        doCountDown();
      }

      try {
        let i = 0;
        for (const item of iterable) {
          const index = i;
          i += 1;

          // Say that we have one more to wait for.
          countDown += 1;

          EPromise.resolve(item)
            .then(
              value => doCombine({ status: 'fulfilled', value }, index), // Successful resolve.
              reason => doCombine({ status: 'rejected', reason }, index), // Failed resolve.
            )
            .catch(rejectOnce);
        }

        // If we had no items or they all settled before the
        // loop ended, this will count down to zero and resolve
        // the result.
        doCountDown();
      } catch (e) {
        rejectOnce(e);
      }
    });
  }

  return EPromise;
}

/**
 * Return a new value based on a reified promise result.
 *
 * @callback Combiner
 * @param {*} previousValue last value passed with CombinerContinue
 * @param {SettledStatus} currentValue current reified promise result
 * @param {number} currentIndex current index in the input iterable
 * @returns {CombinerContinue|SettledStatus} what to do next
 */

/**
 * A reified settled promise.
 * @typedef {SettledFulfilled | SettledRejected} SettledStatus
 */

/**
 * A reified fulfilled promise.
 *
 * @typedef {Object} SettledFulfilled
 * @property {'fulfilled'} status the promise was fulfilled
 * @property {*} [value] the value of the promise resolution
 */

/**
 * A reified rejected promise.
 *
 * @typedef {Object} SettledRejected
 * @property {'rejected'} status the promise was rejected
 * @property {*} [reason] the value of the promise rejection
 */

/**
 * Tell combinePromises to continue with a new value for the result.
 *
 * @typedef {Object} CombinerContinue
 * @property {'continue'} status continue with combining
 * @property {*} result the new result to use as `currentValue`
 */
