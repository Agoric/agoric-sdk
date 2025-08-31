// @jessie-check

let debugInstance = 1;

/**
 * @param {string} path
 * @param {boolean | 'verbose'} enable
 */
export const makeTracer = (path, enable = true) => {
  const sub = (step, subEnable = enable) =>
    makeTracer(`${path}.${step}`, subEnable);
  const key = `----- ${path}.${debugInstance} `;
  debugInstance += 1;
  // the cases below define a named variable to provide better debug info
  switch (enable) {
    case false: {
      const logDisabled = (..._args) => {};
      logDisabled.sub = sub;
      return harden(logDisabled);
    }
    case 'verbose': {
      const infoTick = (optLog, ...args) => {
        if (typeof optLog?.log === 'function') {
          console.info(key, ...args);
        } else {
          console.info(key, optLog, ...args);
        }
      };
      infoTick.sub = sub;
      return harden(infoTick);
    }
    default: {
      const debugTick = (optLog, ...args) => {
        if (typeof optLog?.log === 'function') {
          optLog.log(key, ...args);
        } else {
          console.info(key, optLog, ...args);
        }
      };
      debugTick.sub = sub;
      return harden(debugTick);
    }
  }
};
harden(makeTracer);

/**
 * @typedef {ReturnType<typeof makeTracer>} TraceLogger
 */
