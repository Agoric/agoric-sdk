// @jessie-check

// See https://github.com/Agoric/agoric-sdk/issues/11844
// See https://github.com/Agoric/agoric-sdk/issues/11845
let debugInstance = 1;

/**
 * @param {string} label
 * @param {boolean | 'verbose'} enable
 */
export const makeTracer = (label, enable = true) => {
  const sub = (subLabel, subEnable = enable) =>
    makeTracer(`${label}.${subLabel}`, subEnable);
  const key = `----- ${label},${debugInstance} `;
  debugInstance += 1;
  // the cases below define a named variable to provide better debug info
  switch (enable) {
    case false: {
      const logDisabled = (..._args) => {};
      return harden(Object.assign(logDisabled, { sub }));
    }
    case 'verbose': {
      const infoTick = (optLog, ...args) => {
        // XXX Sniff tests such as this are inherently unreliable and smell bad.
        // Even aside from the security hazard of
        // https://github.com/Agoric/agoric-sdk/issues/11845
        // an object intended as a normal logging argument may accidentally
        // pass this sniff test, causing confusion.
        if (typeof optLog?.log === 'function') {
          console.info(key, ...args);
        } else {
          console.info(key, optLog, ...args);
        }
      };
      return harden(Object.assign(infoTick, { sub }));
    }
    default: {
      const debugTick = (optLog, ...args) => {
        // Another unreliable sniff test like the one above
        if (typeof optLog?.log === 'function') {
          optLog.log(key, ...args);
        } else {
          console.info(key, optLog, ...args);
        }
      };
      return harden(Object.assign(debugTick, { sub }));
    }
  }
};
harden(makeTracer);

/**
 * @typedef {ReturnType<typeof makeTracer>} TraceLogger
 */
