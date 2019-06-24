/**
 * Create an EPromise class that supports eventual send (infix-bang) operations.
 * This is a class that extends the Promise class argument (which may be platform
 * Promises, or some other implementation).
 *
 * Based heavily on nanoq https://github.com/drses/nanoq/blob/master/src/nanoq.js
 *
 * Original spec for the infix-bang desugaring:
 * https://web.archive.org/web/20161026162206/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency
 *
 * @param {typeof Promise} Promise Promise class to derive from
 * @returns {typeof EPromise} EPromise class
 */
export default function makeEPromiseClass(Promise) {
  let asyncIterateHelper;

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

  class EPromise extends Promise {
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
    // implementation of the inherited Promise is.
    static all(iterable) {
      let nleft = 0;
      const res = [];

      return asyncIterateHelper(iterable, {
        refcount(delta) {
          if (nleft < 0) {
            // Already raised an exception
            return;
          }
          nleft += delta;
          if (nleft === 0) {
            this.resolve(res);
          }
        },

        settleOne(index, value, isException) {
          if (nleft < 0) {
            // Already got an error.
            return;
          }
          if (isException) {
            // Got an error just now, so raise it.
            nleft = -1;
            this.reject(value);
            return;
          }
          res[index] = value;
          this.refcount(-1);
        },
      });
    }

    static allSettled(iterable) {
      const res = [];
      let nleft = 0;
      return asyncIterateHelper(iterable, {
        remaining(delta) {
          nleft += delta;
          if (nleft === 0) {
            this.resolve(res);
          }
        },
        settleOne(index, value, isException) {
          if (isException) {
            res[index] = {
              status: 'rejected',
              reason: value,
            };
          } else {
            res[index] = {
              status: 'fulfilled',
              value,
            };
          }
          this.remaining(-1);
        },
      });
    }

    static race(iterable) {
      let nleft = 0;
      return asyncIterateHelper(iterable, {
        remaining(delta) {
          nleft += delta;
          if (nleft < 0) {
            // Already resolved/rejected.
            return;
          }
          if (nleft === 0) {
            // This is our only return.
            this.resolve(undefined);
          }
        },
        settleOne(_index, value, isException) {
          if (nleft < 0) {
            // Already settled.
            return;
          }
          nleft = -1;
          // Make sure future iterations can't make us settle again.
          this.refcount(-1);
          if (isException) {
            this.reject(value);
            return;
          }
          this.resolve(value);
        },
      });
    }
  }

  asyncIterateHelper = function asyncIterate(iterable, handler) {
    // We can use async here, since platform promises are good
    // enough for the async iterable protocol we'd like to crib.
    //
    // However, the promise we return must obey our API.
    return new EPromise(async (resolve, reject) => {
      handler.resolve = resolve;
      handler.reject = reject;
      function captureResult(index) {
        return [
          value => handler.settleOne(index, value, false),
          reason => handler.settleOne(index, reason, true),
        ];
      }

      try {
        // Allow async generators.
        let i = 0;
        handler.remaining(+1); // To prevent returning during iteration.
        for await (const item of iterable) {
          // Say that we have one more.
          handler.remaining(+1);
          // Allow handler.settleOne to adjust remaining.
          this.resolve(item).then(...captureResult(i));
          i += 1;
        }

        // If we had no items, go to zero remaining here.
        handler.remaining(-1);
      } catch (e) {
        reject(e);
      }
    });
  };

  return EPromise;
}
