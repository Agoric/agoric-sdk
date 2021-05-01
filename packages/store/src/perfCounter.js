// @ts-check

export const makePerfCounter = defaultName => {
  let count = 0n;
  let loggedPlace = 10n;
  let weakStoreNameForLogging = `${defaultName}`;

  const logIncrease = () =>
    console.log(`${weakStoreNameForLogging} count: ${count}`);

  const logDecrease = () =>
    console.log(`${weakStoreNameForLogging} decreased to: ${count}`);

  const incrementCount = () => {
    count += 1n;
    if (count < 10n) {
      logIncrease();
    }
    if (count >= loggedPlace) {
      logIncrease();
      loggedPlace *= 10n;
    }
  };

  const decrementCount = () => {
    count -= 1n;
    if (count < 10n) {
      logDecrease();
    }
  };

  const getCount = () => count;
  const addName = name => {
    weakStoreNameForLogging = name;
  };

  return harden({
    incrementCount,
    decrementCount,
    getCount,
    addName,
  });
};

export const makeLogSometimes = (step = 10n) => {
  let logIfGreaterThan = 1n;
  const logSometimes = (value, logString) => {
    if (value > logIfGreaterThan) {
      console.log(logString);
      logIfGreaterThan *= step;
    }
  };
  return logSometimes;
};
