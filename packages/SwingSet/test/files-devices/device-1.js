export function buildRootDeviceNode({ testLog, endowments }) {
  return harden({
    set(arg1, arg2) {
      testLog(`invoke ${arg1} ${arg2}`);
      endowments.shared.push('pushed');
      return harden({ ret: 3 });
    },
  });
}
