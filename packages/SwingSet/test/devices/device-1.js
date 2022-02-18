import { Far } from '@endo/marshal';

export const buildRootDeviceNode = ({ testLog, endowments }) =>
  Far('root', {
    set: (arg1, arg2) => {
      testLog(`invoke ${arg1} ${arg2}`);
      endowments.shared.push('pushed');
      return harden({ ret: 3 });
    },
  });
