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
  const presenceToResolvedRelay = new WeakMap();
  const promiseToRelay = new WeakMap();

  // This special relay accepts Promises, and forwards
  // the remote to its corresponding resolvedRelay.
  //
  // If passed a Promise that is not remote, perform
  // the corresponding local operation.
  let forwardingRelay;
  function relay(p) {
    return promiseToRelay.get(p) || forwardingRelay;
  }

  class EPromise extends BasePromise {
    static makeRemote(executor, unresolvedRelay) {
      let remoteResolve;
      let remoteReject;
      let relayResolve;
      const remoteP = new EPromise((resolve, reject) => {
        remoteResolve = resolve;
        remoteReject = reject;
      });

      if (!unresolvedRelay) {
        // Create a simple unresolvedRelay that just postpones until the
        // resolvedRelay is set.
        //
        // This is insufficient for actual remote Promises (too many round-trips),
        // but is an easy way to create a local Remote.
        const relayP = new EPromise(resolve => {
          relayResolve = resolve;
        });

        const postpone = forwardedOperation => {
          // Just wait until the relay is resolved/rejected.
          return async (p, ...args) => {
            console.log(`forwarding ${forwardedOperation}`);
            await relayP;
            return p[forwardedOperation](args);
          };
        };

        unresolvedRelay = {
          GET: postpone('get'),
          PUT: postpone('put'),
          DELETE: postpone('delete'),
          POST: postpone('post'),
        };
      }

      // Until the remote is resolved, we use the unresolvedRelay.
      promiseToRelay.set(remoteP, unresolvedRelay);

      function rejectRemote(reason) {
        if (relayResolve) {
          relayResolve(null);
        }
        remoteReject(reason);
      }

      function resolveRemote(presence, resolvedRelay) {
        try {
          if (resolvedRelay) {
            // Sanity checks.
            if (Object(resolvedRelay) !== resolvedRelay) {
              throw TypeError(
                `Resolved relay ${resolvedRelay} cannot be a primitive`,
              );
            }
            for (const method of ['GET', 'PUT', 'DELETE', 'POST']) {
              if (typeof resolvedRelay[method] !== 'function') {
                throw TypeError(
                  `Resolved relay ${resolvedRelay} requires a ${method} method`,
                );
              }
            }
            if (Object(presence) !== presence) {
              throw TypeError(`Presence ${presence} cannot be a primitive`);
            }
            if (presence === null) {
              throw TypeError(`Presence ${presence} cannot be null`);
            }
            if (presenceToResolvedRelay.has(presence)) {
              throw TypeError(`Presence ${presence} is already mapped`);
            }
            if (presence && typeof presence.then === 'function') {
              throw TypeError(
                `Presence ${presence} cannot be a Promise or other thenable`,
              );
            }

            // Create a table entry for the presence mapped to the resolvedRelay.
            presenceToResolvedRelay.set(presence, resolvedRelay);
          }

          // Remove the mapping, as our resolvedRelay should be used instead.
          promiseToRelay.delete(remoteP);

          // Resolve with the new presence or other value.
          remoteResolve(presence);

          if (relayResolve) {
            // Activate the default unresolvedRelay.
            relayResolve(resolvedRelay);
          }
        } catch (e) {
          rejectRemote(e);
        }
      }

      // Invoke the callback to let the user resolve/reject.
      executor(resolveRemote, rejectRemote);

      // Return a remote EPromise, which wil be resolved/rejected
      // by the executor.
      return remoteP;
    }

    static resolve(value) {
      return new EPromise(resolve => resolve(value));
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

    delete(key) {
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

  function makeForwarder(operation, localImpl) {
    return async (ep, ...args) => {
      const o = await ep;
      const resolvedRelay = presenceToResolvedRelay.get(o);
      if (resolvedRelay) {
        // The relay was resolved, so give it a naked object.
        return resolvedRelay[operation](o, ...args);
      }

      // Not a Remote, so use the local implementation on the
      // naked object.
      return localImpl(o, ...args);
    };
  }

  forwardingRelay = {
    GET: makeForwarder('GET', (o, key) => o[key]),
    PUT: makeForwarder('PUT', (o, key, val) => (o[key] = val)),
    DELETE: makeForwarder('DELETE', (o, key) => delete o[key]),
    POST: makeForwarder('POST', (o, optKey, args) => {
      if (optKey === undefined || optKey === null) {
        return o(...args);
      }
      return o[optKey](...args);
    }),
  };

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
 * @param {SettledStatus} currentStatus current reified promise result
 * @param {number} currentIndex current index in the input iterable
 * @returns {CombinerContinue|SettledStatus} what to do next
 */

/**
 * A reified settled promise.
 * @typedef {FulfilledStatus | RejectedStatus} SettledStatus
 */

/**
 * A reified fulfilled promise.
 *
 * @typedef {Object} FulfilledStatus
 * @property {'fulfilled'} status the promise was fulfilled
 * @property {*} [value] the value of the promise resolution
 */

/**
 * A reified rejected promise.
 *
 * @typedef {Object} RejectedStatus
 * @property {'rejected'} status the promise was rejected
 * @property {*} [reason] the value of the promise rejection
 */

/**
 * Tell combinePromises to continue with a new value for the result.
 *
 * @typedef {Object} CombinerContinue
 * @property {'continue'} status continue with combining
 * @property {*} result the new result to use as `currentStatus`
 */
