import '@endo/init/debug.js';

import test from '@endo/ses-ava/prepare-endo.js';
import { constructContractCall } from '../../src/utils/gmp.js';

const target = '0x1111111111111111111111111111111111111111';
const call = {
  target,
  functionSignature: 'approve(address,uint256)',
  args: [target, 1n],
} as const;
const encoded =
  '0x095ea7b300000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001';

test('constructContractCall encodes the call', t => {
  t.deepEqual(constructContractCall({ ...call, args: [...call.args] }), {
    target,
    data: encoded,
  });
});

test('constructContractCall appends a calldata suffix', t => {
  for (const [calldataSuffix, data] of [
    ['0x', encoded],
    ['0x1a2b3c4d', `${encoded}1a2b3c4d`],
  ] as const) {
    t.deepEqual(
      constructContractCall({ ...call, args: [...call.args], calldataSuffix }),
      { target, data },
      calldataSuffix,
    );
  }
});

test('constructContractCall rejects a malformed calldata suffix', t => {
  for (const calldataSuffix of ['0xabc', '0xzz', '1a2b'] as const) {
    t.throws(
      () =>
        constructContractCall({
          ...call,
          args: [...call.args],
          calldataSuffix: calldataSuffix as `0x${string}`,
        }),
      { message: /calldataSuffix must be hex bytes/ },
      calldataSuffix,
    );
  }
});
