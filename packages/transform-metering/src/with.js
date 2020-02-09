export function makeWithMeter(replaceGlobalMeter, defaultMeter = null) {
  const withMeter = (thunk, newMeter = defaultMeter) => {
    let oldMeter;
    try {
      oldMeter = replaceGlobalMeter(newMeter);
      return thunk();
    } finally {
      replaceGlobalMeter(oldMeter);
    }
  };
  const withoutMeter = thunk => withMeter(thunk, null);
  return { withMeter, withoutMeter };
}
