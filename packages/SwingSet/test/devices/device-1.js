import { Far } from '@endo/far';

export function buildRootDeviceNode({ testLog, endowments }) {
  return Far('root', {
    set(arg1, arg2) {
      testLog(`invoke ${arg1} ${arg2}`);
      endowments.shared.push('pushed');
      return harden({ ret: 3 });
    },
  });
}
