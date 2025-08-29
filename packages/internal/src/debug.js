// @jessie-check

/**
 * @import {OptPrefixPath} from './types-internal.js';
 */

// TODO This is top level static mutable state. Why did it pass at-jessie-check?
let debugInstance = 1;

const logDisabled = (..._args) => {};
logDisabled.sub = _ => logDisabled;
harden(logDisabled);

/**
 * @typedef {typeof logDisabled} TraceLogger
 */

/**
 * @param {OptPrefixPath} optPrefixPath
 * @param {number} rootInstanceNum
 * @param {boolean | 'verbose'} enable
 * @returns {TraceLogger}
 */
const makeSubTracer = (optPrefixPath, rootInstanceNum, enable) => {
  // DO NOT ASSIGN to the parameter variables above, since they are captured
  // by closures below.
  const makeKey = () => {
    // As much as possible, postpone anything expensive to here, since this is
    // only called when a tracer or sub-tracer function is called. Not when it
    // is made.
    let prefix;
    // instead, make a local assignable copy
    let optPath = optPrefixPath;
    while (optPath !== undefined) {
      const [step, optRestSteps] = optPath;
      if (prefix === undefined) {
        prefix = step;
      } else {
        prefix = `${step}.${prefix}`;
      }
      optPath = optRestSteps;
    }
    return `----- ${prefix}.${rootInstanceNum} `;
  };
  const sub = prefixStep =>
    makeSubTracer([prefixStep, optPrefixPath], rootInstanceNum, enable);

  // Because `debugCount` is pre-incremented before output, starting it at
  // `1` means the output counts start at `2`.
  let debugCount = 1;
  // the cases below define a named variable to provide better debug info
  switch (enable) {
    case false: {
      return logDisabled;
    }
    case 'verbose': {
      const infoTick = (optLog, ...args) => {
        const key = makeKey();
        if (typeof optLog.log === 'function') {
          console.info(key, (debugCount += 1), ...args);
        } else {
          console.info(key, (debugCount += 1), optLog, ...args);
        }
      };
      infoTick.sub = sub;
      return harden(infoTick);
    }
    default: {
      const debugTick = (optLog, ...args) => {
        const key = makeKey();
        if (typeof optLog.log === 'function') {
          optLog.log(key, (debugCount += 1), ...args);
        } else {
          console.info(key, (debugCount += 1), optLog, ...args);
        }
      };
      debugTick.sub = sub;
      return harden(debugTick);
    }
  }
};
harden(makeSubTracer);

/**
 * Makes and returns a tracer function (typically `trace`), that first outputs a
 * structured header one can search on, and then outputs its arguments to
 * `console.info`.
 *
 * The returned tracer function is intended to support passing the Ava test
 * object (typically `t`) as an optional first argument, in which case the
 * remainder of the output is sent there rather than `console.info`. The trace
 * function doesn't test for this specifically, but rather tests if the first
 * argument is something with a `.log` method.
 *
 * When the `enable` argument to `makeTracer` is 'verbose', output is forced to
 * `console.log` even in a successful test, whereas `t.log` _might_ be
 * suppressed in the success case. (TODO is that currently a possible config of
 * `t.log`?)
 *
 * @param {string} name
 * @param {boolean | 'verbose'} [enable]
 * @returns {TraceLogger}
 */
export const makeTracer = (name, enable = true) => {
  debugInstance += 1;
  return makeSubTracer([name, undefined], debugInstance, enable);
};
harden(makeTracer);
