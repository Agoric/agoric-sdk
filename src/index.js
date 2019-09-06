/**
 * Modify a Promise class to have it support eventual send
 * (infix-bang) operations.
 *
 * Based heavily on nanoq
 * https://github.com/drses/nanoq/blob/master/src/nanoq.js
 *
 * Original spec for the infix-bang desugaring:
 * https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency
 *
 * @param {typeof Promise} Promise ES6 Promise class to shim
 * @return {typeof EPromise} Extended promise
 */
export default function maybeExtendPromise(Promise) {
  // Make idempotent, so we don't layer on top of a BasePromise that
  // is adequate.
  if (typeof Promise.makeHandled === 'function') {
    return Promise;
  }

  // xs doesn't support WeakMap in pre-loaded closures
  // aka "vetted customization code"
  let presenceToHandler;
  let presenceToPromise;
  let promiseToHandler;
  function ensureMaps() {
    if (!presenceToHandler) {
      presenceToHandler = new WeakMap();
      presenceToPromise = new WeakMap();
      promiseToHandler = new WeakMap();
    }
  }

  // This special handler accepts Promises, and forwards
  // handled Promises to their corresponding fulfilledHandler.
  let forwardingHandler;
  function handle(p, operation, ...args) {
    const unfulfilledHandler = promiseToHandler.get(p);
    let executor;
    if (unfulfilledHandler) {
      if (typeof unfulfilledHandler[operation] !== 'function') {
        throw TypeError(`unfulfilledHandler.${operation} is not a function`);
      }

      executor = (resolve, reject) => {
        // We run in a future turn to prevent synchronous attacks,
        Promise.resolve()
          .then(() =>
            // and resolve to the answer from the specific unfulfilled handler,
            resolve(unfulfilledHandler[operation](p, ...args)),
          )
          .catch(reject);
      };
    } else {
      executor = (resolve, reject) => {
        // We run in a future turn to prevent synchronous attacks,
        Promise.resolve(p)
          .then(o => {
            // We now have the naked object,
            if (typeof forwardingHandler[operation] !== 'function') {
              throw TypeError(
                `forwardingHandler.${operation} is not a function`,
              );
            }
            // and resolve to the forwardingHandler's operation.
            resolve(forwardingHandler[operation](o, ...args));
          })
          .catch(reject);
      };
    }

    // We return a handled promise with the default unfulfilled handler.
    // This prevents a race between the above Promise.resolves and
    // pipelining.
    return Promise.makeHandled(executor);
  }

  Object.defineProperties(
    Promise.prototype,
    Object.getOwnPropertyDescriptors({
      get(key) {
        return handle(this, 'GET', key);
      },

      put(key, val) {
        return handle(this, 'PUT', key, val);
      },

      delete(key) {
        return handle(this, 'DELETE', key);
      },

      post(optKey, args) {
        return handle(this, 'POST', optKey, args);
      },

      invoke(optKey, ...args) {
        return handle(this, 'POST', optKey, args);
      },

      fapply(args) {
        return handle(this, 'POST', undefined, args);
      },

      fcall(...args) {
        return handle(this, 'POST', undefined, args);
      },
    }),
  );

  const baseResolve = Promise.resolve.bind(Promise);

  // Add Promise.makeHandled and update Promise.resolve.
  Object.defineProperties(
    Promise,
    Object.getOwnPropertyDescriptors({
      resolve(value) {
        ensureMaps();
        // Resolving a Presence returns the pre-registered handled promise.
        const handledPromise = presenceToPromise.get(value);
        if (handledPromise) {
          return handledPromise;
        }
        return baseResolve(value);
      },

      makeHandled(executor, unfulfilledHandler = undefined) {
        ensureMaps();
        let handledResolve;
        let handledReject;
        let continueForwarding = () => {};
        const handledP = new Promise((resolve, reject) => {
          handledResolve = resolve;
          handledReject = reject;
        });

        if (!unfulfilledHandler) {
          // Create a simple unfulfilledHandler that just postpones until the
          // fulfilledHandler is set.
          //
          // This is insufficient for actual remote handled Promises
          // (too many round-trips), but is an easy way to create a
          // local handled Promise.
          const interlockP = new Promise(resolve => {
            continueForwarding = (targetP = undefined) => {
              // Box the target promise so that it isn't further resolved.
              resolve([targetP]);
              // Return undefined.
            };
          });

          const makePostponed = postponedOperation => {
            // Just wait until the handler is resolved/rejected.
            return function postpone(x, ...args) {
              // console.log(`forwarding ${postponedOperation}`);
              return Promise.makeHandled((resolve, reject) => {
                interlockP
                  .then(([targetP]) => {
                    // If targetP is a handled promise, use it, otherwise x.
                    const nextPromise = targetP || x;
                    resolve(nextPromise[postponedOperation](...args));
                  })
                  .catch(reject);
              });
            };
          };

          unfulfilledHandler = {
            GET: makePostponed('get'),
            PUT: makePostponed('put'),
            DELETE: makePostponed('delete'),
            POST: makePostponed('post'),
          };
        }

        function validateHandler(h) {
          if (Object(h) !== h) {
            throw TypeError(`Handler ${h} cannot be a primitive`);
          }
        }
        validateHandler(unfulfilledHandler);

        // Until the handled promise is resolved, we use the unfulfilledHandler.
        promiseToHandler.set(handledP, unfulfilledHandler);

        function rejectHandled(reason) {
          continueForwarding();
          handledReject(reason);
        }

        async function resolveHandled(target, fulfilledHandler) {
          try {
            // Sanity checks.
            if (fulfilledHandler) {
              validateHandler(fulfilledHandler);
            }

            if (!fulfilledHandler) {
              // Resolve with the target when it's ready.
              handledResolve(target);

              const existingUnfulfilledHandler = promiseToHandler.get(target);
              if (existingUnfulfilledHandler) {
                // Reuse the unfulfilled handler.
                promiseToHandler.set(handledP, existingUnfulfilledHandler);
                return continueForwarding(target);
              }

              // See if the target is a presence we already know of.
              const presence = await target;
              const existingFulfilledHandler = presenceToHandler.get(presence);
              if (existingFulfilledHandler) {
                promiseToHandler.set(handledP, existingFulfilledHandler);
                return continueForwarding();
              }

              // Remove the mapping, as we don't need a handler.
              promiseToHandler.delete(handledP);
              return continueForwarding();
            }

            // Validate and install our mapped target (i.e. presence).
            const presence = target;
            if (Object(presence) !== presence) {
              throw TypeError(`Presence ${presence} cannot be a primitive`);
            }
            if (presence === null) {
              throw TypeError(`Presence ${presence} cannot be null`);
            }
            if (presence && typeof presence.then === 'function') {
              throw TypeError(
                `Presence ${presence} cannot be a Promise or other thenable`,
              );
            }

            // Just like platform Promises, multiple calls to resolve
            // don't fail.
            if (!presenceToHandler.has(presence)) {
              // Create table entries for the presence mapped to the
              // fulfilledHandler.
              presenceToPromise.set(presence, handledP);
              presenceToHandler.set(presence, fulfilledHandler);
            }

            // Remove the mapping, as our fulfilledHandler should be
            // used instead.
            promiseToHandler.delete(handledP);

            // We committed to this presence, so resolve.
            handledResolve(presence);
          } catch (e) {
            handledReject(e);
          }
          return continueForwarding();
        }

        // Invoke the callback to let the user resolve/reject.
        executor((...args) => {
          resolveHandled(...args);
        }, rejectHandled);

        // Return a handled Promise, which wil be resolved/rejected
        // by the executor.
        return handledP;
      },
    }),
  );

  function makeForwarder(operation, localImpl) {
    return (o, ...args) => {
      // We are in another turn already, and have the naked object.
      const fulfilledHandler = presenceToHandler.get(o);
      if (fulfilledHandler) {
        // The handler was resolved, so use it.
        if (typeof fulfilledHandler[operation] !== 'function') {
          throw TypeError(`fulfilledHandler.${operation} is not a function`);
        }
        return fulfilledHandler[operation](o, ...args);
      }

      // Not handled, so use the local implementation.
      return localImpl(o, ...args);
    };
  }

  forwardingHandler = {
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
  return Promise;
}
