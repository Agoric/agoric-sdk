/* eslint-disable no-use-before-define */
import { Fail, b, q } from '@endo/errors';
import { Far, Remotable, getInterfaceOf } from '@endo/pass-style';
import { E } from '@endo/eventual-send';
import { getMethodNames } from '@endo/eventual-send/utils.js';
import { makePromiseKit } from '@endo/promise-kit';
import { makeEquate } from './equate.js';
import { makeConvertKit } from './convert.js';

const { fromEntries, defineProperties } = Object;

/**
 * @param {LogStore} log
 * @param {WeakBijection} bijection
 * @param {VowTools} vowTools
 * @param {(vowish: Promise | Vow) => void} watchWake
 * @param {(problem: Error) => void} panic
 */
export const makeReplayMembrane = (
  log,
  bijection,
  vowTools,
  watchWake,
  panic,
) => {
  const { when } = vowTools;

  const equate = makeEquate(bijection);

  const guestPromiseMap = new WeakMap();

  // ////////////// Host or Interpreter to Guest ///////////////////////////////

  /**
   * When replaying, this comes from interpreting the log.
   * Otherwise, it is triggered by a watcher watching hostVow,
   * that must also log it.
   *
   * @param {HostVow} hostVow
   * @param {Host} hostFulfillment
   */
  const doFulfill = (hostVow, hostFulfillment) => {
    const guestPromise = hostToGuest(hostVow);
    const status = guestPromiseMap.get(guestPromise);
    if (status === 'settled') {
      return;
    }
    const guestFulfillment = hostToGuest(hostFulfillment);
    status.resolve(guestFulfillment);
    guestPromiseMap.set(guestPromise, 'settled');
  };

  /**
   * When replaying, this comes from interpreting the log.
   * Otherwise, it is triggered by a watcher watching hostVow,
   * that must also log it.
   *
   * @param {HostVow} hostVow
   * @param {Host} hostReason
   */
  const doReject = (hostVow, hostReason) => {
    const guestPromise = hostToGuest(hostVow);
    const status = guestPromiseMap.get(guestPromise);
    if (status === 'settled') {
      return;
    }
    const guestReason = hostToGuest(hostReason);
    status.reject(guestReason);
    guestPromiseMap.delete(guestPromise);
  };

  /**
   * When replaying, after the guest thinks it has called a host method,
   * triggering `checkCall`, that host method emulator consumes one of
   * these entries from the log to return what it is supposed to.
   * It returns an Outcome describing either a throw or return, because we
   * reserve the actual throw channels for replay errors and internal
   * errors.
   *
   * @param {number} callIndex
   * @param {Host} hostResult
   * @returns {Outcome}
   */
  const doReturn = (callIndex, hostResult) => {
    unnestInterpreter(callIndex);
    const guestResult = hostToGuest(hostResult);
    return harden({
      kind: 'return',
      result: guestResult,
    });
  };

  /**
   * When replaying, after the guest thinks it has called a host method,
   * triggering `checkCall`, that host method emulator consumes one of
   * these entries from the log to return what it is supposed to.
   * It returns an Outcome describing either a throw or return, because we
   * reserve the actual throw channels for replay errors and internal
   * errors.
   *
   * @param {number} callIndex
   * @param {Host} hostProblem
   * @returns {Outcome}
   */
  const doThrow = (callIndex, hostProblem) => {
    unnestInterpreter(callIndex);
    const guestProblem = hostToGuest(hostProblem);
    return harden({
      kind: 'throw',
      problem: guestProblem,
    });
  };

  // ///////////// Guest to Host or consume log ////////////////////////////////

  const performCall = (hostTarget, optVerb, hostArgs, callIndex) => {
    let hostResult;
    try {
      hostResult = optVerb
        ? hostTarget[optVerb](...hostArgs)
        : hostTarget(...hostArgs);
    } catch (hostProblem) {
      return logDo(nestDispatch, harden(['doThrow', callIndex, hostProblem]));
    }
    return logDo(nestDispatch, harden(['doReturn', callIndex, hostResult]));
  };

  const guestCallsHost = (guestTarget, optVerb, guestArgs, callIndex) => {
    if (!bijection.hasGuest(guestTarget)) {
      // This happens in a delayed guest-to-host call from a previous run.
      // In that case, the bijection was reset and all guest caps
      // created in the previous run were unregistered,
      // including guestTarget.
      // Throwing an error back to the old guest caller may cause
      // it to proceed in all sorts of crazy ways. But that old run
      // should now be isolated and unable to cause any observable effects.
      // Well, except for resource exhaustion including infinite loops,
      // which would be a genuine problem.
      //
      // Console logging of unhandled rejections, errors thrown to the top
      // of the event loop, or anything else are not problematic effects.
      // At this level of abstraction, we don't consider console logging
      // activity to be observable. Thus, it is also ok for the guest
      // function, which should otherwise be closed, to
      // capture (lexically "close over") the `console`.
      const extraDiagnostic =
        callStack.length === 0
          ? ''
          : // This case should only happen when the callStack is empty
            ` with non-empty callstack ${q(callStack)};`;
      Fail`Called from a previous run: ${guestTarget}${b(extraDiagnostic)}`;
    }
    /** @type {Outcome} */
    let outcome;
    try {
      const guestEntry = harden([
        'checkCall',
        guestTarget,
        optVerb,
        guestArgs,
        callIndex,
      ]);
      if (log.isReplaying()) {
        const entry = log.nextEntry();
        equate(
          guestEntry,
          entry,
          `replay ${callIndex}:
     ${q(guestEntry)}
  vs ${q(entry)}
    `,
        );
        outcome = /** @type {Outcome} */ (nestInterpreter(callIndex));
      } else {
        const entry = guestToHost(guestEntry);
        log.pushEntry(entry);
        const [_, ...args] = entry;
        nestInterpreter(callIndex);
        outcome = performCall(...args);
      }
    } catch (fatalError) {
      return panic(fatalError);
    }

    if (outcome.kind === 'return') {
      return outcome.result;
    } else {
      outcome.kind === 'throw' ||
        // @ts-expect-error TS correctly knows this case would be outside
        // the type. But that's what we want to check.
        Fail`unexpected outcome kind ${q(outcome.kind)}`;
      throw outcome.problem;
    }
  };

  // //////////////// Converters ///////////////////////////////////////////////

  const makeGuestForHostRemotable = hRem => {
    let gRem;
    /** @param {PropertyKey} [optVerb] */
    const makeGuestMethod = (optVerb = undefined) => {
      const guestMethod = (...guestArgs) => {
        const callIndex = log.getIndex();
        return guestCallsHost(gRem, optVerb, guestArgs, callIndex);
      };
      if (optVerb) {
        defineProperties(guestMethod, {
          name: { value: String(optVerb) },
          length: { value: Number(hRem[optVerb].length || 0) },
        });
      } else {
        defineProperties(guestMethod, {
          name: { value: String(hRem.name || 'anon') },
          length: { value: Number(hRem.length || 0) },
        });
      }
      return guestMethod;
    };
    const iface = String(getInterfaceOf(hRem) || 'remotable');
    const guestIface = `${iface} guest wrapper`; // just for debugging clarity
    if (typeof hRem === 'function') {
      // NOTE: Assumes that a far function has no "static" methods. This
      // is the current marshal design, but revisit this if we change our
      // minds.
      gRem = Remotable(guestIface, undefined, makeGuestMethod());
      // NOTE: If we ever do support that, probably all we need
      // to do is remove the following `throw Fail` line.
      throw Fail`host far functions not yet passable`;
    } else {
      const methodNames = getMethodNames(hRem);
      const guestMethods = methodNames.map(name => [
        name,
        makeGuestMethod(name),
      ]);
      // TODO in order to support E *well*,
      // use HandledPromise to make gRem a remote presence for hRem
      gRem = Remotable(guestIface, undefined, fromEntries(guestMethods));
    }
    return gRem;
  };
  harden(makeGuestForHostRemotable);

  const makeGuestForHostVow = hVow => {
    // TODO in order to support E *well*,
    // use HandledPromise to make `promise` a handled promise for hVow
    const { promise, resolve, reject } = makePromiseKit();
    guestPromiseMap.set(promise, harden({ resolve, reject }));

    watchWake(hVow);

    void when(
      hVow,
      hostFulfillment => {
        if (!log.isReplaying() && guestPromiseMap.get(promise) !== 'settled') {
          /** @type {LogEntry} */
          const entry = harden(['doFulfill', hVow, hostFulfillment]);
          log.pushEntry(entry);
          interpretOne(topDispatch, entry);
        }
      },
      hostReason => {
        if (!log.isReplaying() && guestPromiseMap.get(promise) !== 'settled') {
          /** @type {LogEntry} */
          const entry = harden(['doReject', hVow, hostReason]);
          log.pushEntry(entry);
          interpretOne(topDispatch, entry);
        }
      },
    );
    return promise;
  };
  harden(makeGuestForHostVow);

  const { guestToHost, hostToGuest } = makeConvertKit(
    bijection,
    makeGuestForHostRemotable,
    makeGuestForHostVow,
  );

  // /////////////////////////////// Interpreter ///////////////////////////////

  /**
   * These are the only ones that are driven from the interpreter loop
   */
  const topDispatch = harden({
    doFulfill,
    doReject,
    // doCall, // unimplemented in the current plan
  });

  /**
   * These are the only ones that are driven from the interpreter loop
   */
  const nestDispatch = harden({
    // doCall, // unimplemented in the current plan
    doReturn,
    doThrow,
  });

  const interpretOne = (dispatch, [op, ...args]) => {
    try {
      op in dispatch ||
        // separate line so I can set a breakpoint
        Fail`unexpected dispatch op: ${q(op)}`;
      return dispatch[op](...args);
    } catch (problem) {
      throw panic(problem);
    }
  };

  const logDo = (dispatch, entry) => {
    log.pushEntry(entry);
    return interpretOne(dispatch, entry);
  };

  const callStack = [];

  let unnestFlag = false;

  /**
   * @param {number} callIndex
   * @returns {Outcome | undefined}
   */
  const nestInterpreter = callIndex => {
    callStack.push(callIndex);
    while (log.isReplaying() && !stopped) {
      const entry = log.nextEntry();
      const optOutcome = interpretOne(nestDispatch, entry);
      if (unnestFlag) {
        optOutcome ||
          // separate line so I can set a breakpoint
          Fail`only unnest with an outcome: ${q(entry[0])}`;
        unnestFlag = false;
        return optOutcome;
      }
    }
    unnestFlag = false;
  };

  /**
   * @param {number} callIndex
   */
  const unnestInterpreter = callIndex => {
    !stopped ||
      Fail`This membrane stopped. Restart with new membrane ${replayMembrane}`;
    callStack.length >= 1 ||
      // separate line so I can set a breakpoint
      Fail`Unmatched unnest: ${q(callIndex)}`;
    const i = callStack.pop();
    i === callIndex ||
      // separate line so I can set a breakpoint
      Fail`Unexpected unnest: ${q(callIndex)} vs ${q(i)}`;
    unnestFlag = true;
    if (callStack.length === 0) {
      void E.when(undefined, wake);
    }
  };

  let stopped = false;

  const wake = () => {
    while (log.isReplaying() && !stopped) {
      callStack.length === 0 ||
        Fail`wake only with empty callStack: ${q(callStack)}`;
      const entry = log.peekEntry();
      const op = entry[0];
      if (!(op in topDispatch)) {
        return;
      }
      void log.nextEntry();
      interpretOne(topDispatch, entry);
    }
  };

  const stop = () => {
    stopped = true;
  };

  const replayMembrane = Far('replayMembrane', {
    hostToGuest,
    guestToHost,
    wake,
    stop,
  });
  return replayMembrane;
};
harden(makeReplayMembrane);

/** @typedef {ReturnType<makeReplayMembrane>} ReplayMembrane */
