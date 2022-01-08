let debugInstance = 1;

const makeTracer = name => {
  debugInstance += 1;
  let debugCount = 1;
  const key = `----- ${name}.${debugInstance} `;
  const debugTick = (...args) => {
    console.log(key, (debugCount += 1), ...args);
  };
  return debugTick;
};

export { makeTracer };
