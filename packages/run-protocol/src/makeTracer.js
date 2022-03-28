let debugInstance = 1;

const makeTracer = (name, enable = true) => {
  debugInstance += 1;
  let debugCount = 1;
  const key = `----- ${name}.${debugInstance} `;
  // the cases below define a named variable to provide better debug info
  switch (enable) {
    case false: {
      const logDisabled = (..._args) => {};
      return logDisabled;
    }
    case 'info': {
      const infoTick = (...args) => {
        console.info(key, (debugCount += 1), ...args);
      };
      return infoTick;
    }
    default: {
      const debugTick = (...args) => {
        console.log(key, (debugCount += 1), ...args);
      };
      return debugTick;
    }
  }
};

export { makeTracer };
