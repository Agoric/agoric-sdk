import { Fail, q } from '@endo/errors';
import { kunser } from '@agoric/kmarshal';
import { makeQueue } from '@endo/stream';

/**
 * @import { ERef } from '@endo/far'
 * @import { RunPolicy } from '../src/types-external.js'
 */

/** @typedef {{ provideRunPolicy: () => RunPolicy | undefined }} RunHarness */

/**
 * @param {import('../src/controller/controller.js').SwingsetController} controller
 * @param {RunHarness} [harness]
 */
export const makeRunUtils = (controller, harness) => {
  const mutex = makeQueue();
  mutex.put('dummy result'); // so the first `await mutex.get()` doesn't hang

  const logRunFailure = reason =>
    console.log('controller.run() failure', reason);

  /**
   * Wait for exclusive access to the controller, then before relinquishing that access,
   * enqueue and process a delivery and return the result.
   *
   * @param {() => ERef<void | ReturnType<typeof controller['queueToVatObject']>>} deliveryThunk
   * function for enqueueing a delivery and returning the result kpid (if any)
   * @param {boolean} [voidResult] whether to ignore the result
   * @returns {Promise<any>}
   */
  const queueAndRun = async (deliveryThunk, voidResult = false) => {
    await mutex.get();
    const kpid = await deliveryThunk();
    const runPolicy = harness && harness.provideRunPolicy();
    const runResultP = controller.run(runPolicy);
    mutex.put(runResultP.catch(logRunFailure));
    await runResultP;

    if (voidResult) {
      return undefined;
    }
    const status = controller.kpStatus(kpid);
    switch (status) {
      case 'fulfilled':
        return kunser(controller.kpResolution(kpid));
      case 'rejected':
        throw kunser(controller.kpResolution(kpid));
      case 'unresolved':
        throw Fail`unsettled value for ${q(kpid)}`;
      default:
        throw Fail`unknown promise status ${q(kpid)} ${q(status)}`;
    }
  };

  /**
   * @typedef EVProxyMethods
   * @property {(presence: unknown) => Record<string, (...args: any) => Promise<void>>} sendOnly
   *   Returns a "methods proxy" for the presence that ignores the results of
   *   each method invocation.
   * @property {(name: string) => Record<string, (...args: any) => Promise<any>>} vat
   *   Returns a "methods proxy" for the root object of the specified vat.
   *   So e.g. `EV.vat('foo').m(0)` becomes
   *   `controller.queueToVatRoot('foo', 'm', [0])`.
   * @property {(presence: unknown) => Record<string, Promise<any>>} get
   *   Returns a "values proxy" for the presence for which each requested
   *   property manifests as a promise.
   */
  /**
   * @typedef {import('@endo/eventual-send').EProxy & EVProxyMethods} EVProxy
   *   Given a presence, return a "methods proxy" for which each requested
   *   property manifests as a method that forwards its invocation through the
   *   controller to the presence as an invocation of an identically-named method
   *   with identical arguments (modulo passable translation).
   *   So e.g. `EV(x).m(0)` becomes `controller.queueToVatObject(x, 'm', [0])`.
   */

  // IMPORTANT WARNING TO USERS OF `EV`
  //
  // `EV` presents an abstraction that can be used (within tests only!) to get
  // much of the convenience with respect to messaging that `E` provides in
  // normal code.  However, this convenience comes with a huge caveat that all
  // users of this convenience feature MUST keep in mind.
  //
  // A test can drop messages onto the kernel's run queue using the
  // `controller.queueToVatRoot` and `controller.queueToVatObject` methods.
  // These are synchronous operations which merely place messages onto the run
  // queue without causing execution.  Execution, on the other hand, is
  // initiated by calling `controller.run`, which will cause the kernel to begin
  // delivering messages to vats from the run queue, continuing until the run
  // queue is exhausted.  HOWEVER, exhaustion of the run queue, which resolves
  // the result promise returned by the `run` call, IS NOT coupled in any causal
  // way to the resolution of result promises associated with the individual
  // queued messages themselves.  The status and resolution values of these
  // promises can be synchronously queried (by kpid) via the
  // `controller.kpStatus` and `controller.kpResolution` methods once `run` has
  // completed.  These queries are only available once the swingset has
  // reqlinquished agency, i.e., when the work initiated by `controller.run` has
  // finished.  At that point, nothing is going on inside the kernel, and
  // nothing WILL be going on inside the kernel until a subsequent call to
  // `controller.run`, which in turn will only have an effect if additional
  // messages have been placed on the kernel run queue in the meantime.  You MAY
  // NOT call `queueToVatRoot`, `queueToVatObject`, `kpStatus`, or
  // `kpResolution` while run queue execution, triggered by a call to `run`, is
  // in progress
  //
  // The functionality made available by `EV` looks similar to that provided by
  // `E`, but it is very much not.  When you send a message using `EV`, it
  // places the message onto the kernel run queue and then immediately invokes
  // `controller.run`.  When the result of `run` resolves, the kpid returned by
  // the message enqueueing operation is queried.  If at that time the promise
  // it identifies is resolved (or rejected), the value it was resolved (or
  // rejected) to is used as the result from the `EV` invocation.  However, if
  // it is still pending at that time, `EV` will throw an exception, which will
  // manifest as a rejection and your test will fail confusingly or abort.  This
  // means that if you initiate some operation via an `EV` message send, it must
  // complete within a single `run` cycle for it to be of any use to you.  This
  // is quite different from a message sent using `E`, which will return a
  // promise that can remain pending indefinitely, possibly to be settled by a
  // future message delivery.

  /**
   * @template {(typeof controller.queueToVatObject) | (typeof controller.queueToVatRoot)} T
   * @param {T} invoker
   * @param {Parameters<T>[0]} target
   * @param {boolean} [voidResult]
   */
  const makeMethodsProxy = (invoker, target, voidResult = false) =>
    new Proxy(harden({}), {
      get: (_t, method, _rx) => {
        const resultPolicy = voidResult ? 'none' : undefined;
        const boundMethod = (...args) =>
          queueAndRun(
            () => invoker(target, method, args, resultPolicy),
            voidResult,
          );
        return harden(boundMethod);
      },
    });

  const EV = /** @type {EVProxy} */ (
    Object.assign(
      presence => makeMethodsProxy(controller.queueToVatObject, presence),
      {
        vat: vatName => makeMethodsProxy(controller.queueToVatRoot, vatName),
        sendOnly: presence =>
          makeMethodsProxy(controller.queueToVatObject, presence, true),
        get: presence =>
          new Proxy(harden({}), {
            get: (_t, key, _rx) =>
              EV.vat('bootstrap').awaitVatObject(presence, [key]),
          }),
      },
    )
  );
  return harden({ queueAndRun, EV });
};

/**
 * @typedef {ReturnType<typeof makeRunUtils>} RunUtils
 */
