import test from 'ava';
import {
  decodeRemoteIbcAddress,
  localAddrToPortID,
} from '../tools/ibc-utils.js';

test('decodeRemoteIbcAddress', t => {
  /** @type {[string, any][]} */
  const cases = [
    [
      '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
      {
        hops: ['connection-0'],
        order: 'ORDERED',
        rPortID: 'icahost',
        version:
          '{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
      },
    ],
  ];
  for (const [raw, parsed] of cases) {
    t.deepEqual(decodeRemoteIbcAddress(raw), parsed);
  }
});

test('localAddrToPortID', t => {
  /** @type {[import('../tools/ibc-utils.js').LocalIbcAddress, string][]} */
  const good = [['/ibc-port/my-cool-port-name', 'my-cool-port-name']];
  for (const [raw, parsed] of good) {
    t.deepEqual(localAddrToPortID(raw), parsed);
  }

  /** @type {[import('../tools/ibc-utils.js').LocalIbcAddress, string][]} */
  const bad = [
    [
      '/ibc-port/',
      'Invalid port specification /ibc-port/; expected "/ibc-port/PORT"',
    ],
    [
      // @ts-expect-error invalid port spec
      'ibc-port',
      'Invalid port specification ibc-port; expected "/ibc-port/PORT"',
    ],
  ];
  for (const [raw, message] of bad) {
    t.throws(() => localAddrToPortID(raw), { message });
  }
});
