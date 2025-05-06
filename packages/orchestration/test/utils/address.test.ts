import test from '@endo/ses-ava/prepare-endo.js';
import { validateRemoteIbcAddress } from '@agoric/vats/tools/ibc-utils.js';
import {
  makeICAChannelAddress,
  makeICQChannelAddress,
  findAddressField,
  getBech32Prefix,
} from '../../src/utils/address.js';

test('makeICAChannelAddress', t => {
  // @ts-expect-error intentional
  t.throws(() => makeICAChannelAddress(), {
    message: 'hostConnectionId is required',
  });
  // @ts-expect-error intentional
  t.throws(() => makeICAChannelAddress('connection-0'), {
    message: 'controllerConnectionId is required',
  });
  t.is(
    makeICAChannelAddress('connection-1', 'connection-0'),
    '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
    'returns connection string when controllerConnectionId and hostConnectionId are provided',
  );
  t.is(
    makeICAChannelAddress('connection-1', 'connection-0', {
      version: 'ics27-0',
    }),
    '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-0","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
    'accepts custom version',
  );
  t.is(
    makeICAChannelAddress('connection-1', 'connection-0', {
      encoding: 'test',
    }),
    '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"test","txType":"sdk_multi_msg"}',
    'accepts custom encoding',
  );
  t.is(
    makeICAChannelAddress('connection-1', 'connection-0', {
      ordering: 'unordered',
    }),
    '/ibc-hop/connection-0/ibc-port/icahost/unordered/{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
    'accepts custom ordering',
  );
});

test('findAddressField', t => {
  t.is(
    // @ts-expect-error intentional
    findAddressField('/ibc-hop/'),
    undefined,
    'returns undefined when version json is missing',
  );
  t.is(
    findAddressField(
      '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
    ),
    undefined,
    'returns undefined if address is an empty string',
  );
  t.is(
    findAddressField(
      '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"osmo1m30khedzqy9msu4502u74ugmep30v69pzee370jkas57xhmjfgjqe67ayq","encoding":"proto3","txType":"sdk_multi_msg"}',
    ),
    'osmo1m30khedzqy9msu4502u74ugmep30v69pzee370jkas57xhmjfgjqe67ayq',
    'returns address',
  );
  t.is(
    findAddressField(
      '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controller_connection_id":"connection-0","host_connection_id":"connection-1","address":"osmo1m30khedzqy9msu4502u74ugmep30v69pzee370jkas57xhmjfgjqe67ayq","encoding":"proto3","tx_type":"sdk_multi_msg"}/ibc-channel/channel-1',
    ),
    'osmo1m30khedzqy9msu4502u74ugmep30v69pzee370jkas57xhmjfgjqe67ayq',
    'returns address when localAddrr is appended to version string',
  );
  t.is(
    findAddressField(
      '/ibc-hop/connection-0/ibc-port/icahost/ordered/{not valid JSON}',
    ),
    undefined,
    'returns undefined when JSON is malformed',
  );
});

test('makeICQChannelAddress', t => {
  // @ts-expect-error intentional
  t.throws(() => makeICQChannelAddress(), {
    message: 'controllerConnectionId is required',
  });
  t.is(
    makeICQChannelAddress('connection-0'),
    '/ibc-hop/connection-0/ibc-port/icqhost/unordered/icq-1',
    'returns connection string when controllerConnectionId is provided',
  );
  t.is(
    makeICQChannelAddress('connection-0', 'icq-2'),
    '/ibc-hop/connection-0/ibc-port/icqhost/unordered/icq-2',
    'accepts custom version',
  );
  t.throws(
    () =>
      validateRemoteIbcAddress(
        makeICQChannelAddress('connection-0', 'ic/q-/2'),
      ),
    {
      message:
        /must be '\(\/ibc-hop\/CONNECTION\)\*\/ibc-port\/PORT\/\(ordered\|unordered\)\/VERSION'/,
    },
    'makeICQChannelAddress not hardened against malformed version. use `validateRemoteIbcAddress` to detect this, or expect IBC ProtocolImpl to throw',
  );
});

const bech32 = test.macro({
  title: (_, input: string, expected: string | null) =>
    expected !== null
      ? `can extract ${expected} prefix from ${input}`
      : `throws error for invalid address ${input}`,
  exec: (t, input: string, expected: string | null, error?: string) => {
    if (expected !== null) {
      t.is(getBech32Prefix(input), expected);
    } else {
      t.throws(() => getBech32Prefix(input), { message: error });
    }
  },
});

test(bech32, 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'bc');
test(bech32, 'cosmos1n4f2eqt2gm5mh6gevf8aw2wrf75q25yru09yvn', 'cosmos');
test(bech32, '111qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', '11');
test(
  bech32,
  'qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  null,
  'No separator character for "qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"',
);
test(
  bech32,
  '1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  null,
  'Missing prefix for "1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"',
);
