export function makeWithMeter(setGlobalMeter, defaultMeter = null) {
  const withMeter = (thunk, newMeter = defaultMeter) => {
    let oldMeter;
    try {
      oldMeter = setGlobalMeter(newMeter);
      return thunk();
    } finally {
      setGlobalMeter(oldMeter);
    }
  };
  const withoutMeter = thunk => withMeter(thunk, null);
  return { withMeter, withoutMeter };
}
