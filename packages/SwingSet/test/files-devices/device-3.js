export function buildRootDeviceNode({
  setDeviceState,
  getDeviceState,
  testLog,
}) {
  testLog(typeof getDeviceState());

  return harden({
    setState(arg) {
      setDeviceState(arg);
      return 'ok';
    },
    getState() {
      return harden(getDeviceState());
    },
  });
}
