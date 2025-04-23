import { validateRemoteIbcAddress } from '@agoric/vats/tools/ibc-utils.js';
import test from '@endo/ses-ava/prepare-endo.js';
import type { Bech32Address } from '../../src/cosmos-api.ts';
import type { CosmosChainAddress } from '../../src/orchestration-api.ts';
import {
  accountIdTo32Bytes,
  chainOfAccount,
  findAddressField,
  getBech32Prefix,
  makeICAChannelAddress,
  makeICQChannelAddress,
  parseAccountId,
  parseAccountIdArg,
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
  title: (_, input: Bech32Address, expected: string | null) =>
    expected !== null
      ? `can extract ${expected} prefix from ${input}`
      : `throws error for invalid address ${input}`,
  exec: (t, input: Bech32Address, expected: string | null, error?: string) => {
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
// @ts-expect-error intentionally invalid address
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

const CAIP10_ETH = 'eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb';
const CAIP10_COSMOS =
  'cosmos:cosmoshub-3:cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0';
const COSMOS_NOBLE_RECORD: CosmosChainAddress = {
  chainId: 'noble-1',
  value: 'noble1test',
  encoding: 'bech32',
};
const COSMOS_AG_RECORD: CosmosChainAddress = {
  chainId: 'agoric-3',
  encoding: 'bech32',
  value: 'agoric13rj0cc0hm5ac2nt0sdup2l7gvkx4v9tyvgq3h2',
};

test(`parse CAIP-10`, async t => {
  t.deepEqual(parseAccountId(CAIP10_ETH), {
    namespace: 'eip155',
    reference: '1',
    accountAddress: `0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb`,
  });
  t.deepEqual(parseAccountId(CAIP10_COSMOS), {
    namespace: 'cosmos',
    reference: 'cosmoshub-3',
    accountAddress: `cosmos1t2uflqwqe0fsj0shcfkrvpukewcw40yjj6hdc0`,
  });
});

test(`parse COSMOS`, async t => {
  t.deepEqual(parseAccountIdArg(COSMOS_NOBLE_RECORD), {
    namespace: 'cosmos',
    reference: 'noble-1',
    accountAddress: COSMOS_NOBLE_RECORD.value,
  });
  t.deepEqual(parseAccountIdArg(COSMOS_AG_RECORD), {
    namespace: 'cosmos',
    reference: 'agoric-3',
    accountAddress: COSMOS_AG_RECORD.value,
  });
});

test(`parse BECH32 (fail)`, async t => {
  const BECH32_ADDRESS =
    'osmo1ht7u569vpuryp6utadsydcne9ckeh2v8dkd38v5hptjl3u2ewppqc6kzgd';

  t.throws(
    () =>
      // @ts-expect-error illegal type
      parseAccountIdArg(BECH32_ADDRESS),
    {
      message: `malformed CAIP-10 accountId: "${BECH32_ADDRESS}"`,
    },
  );
  t.throws(
    () =>
      // @ts-expect-error illegal type
      parseAccountId(BECH32_ADDRESS),
    {
      message: `malformed CAIP-10 accountId: "${BECH32_ADDRESS}"`,
    },
  );
});

test('extract CaipChainId from AccountIdArg', t => {
  t.is(chainOfAccount(CAIP10_ETH), 'eip155:1');
  t.is(chainOfAccount(CAIP10_COSMOS), 'cosmos:cosmoshub-3');
  t.is(chainOfAccount(COSMOS_AG_RECORD), 'cosmos:agoric-3');

  t.throws(
    () =>
      chainOfAccount(
        // @ts-expect-error illegal type
        COSMOS_AG_RECORD.value,
      ),
    {
      message: `malformed CAIP-10 accountId: "${COSMOS_AG_RECORD.value}"`,
    },
  );
});
const cctpFixture = [
  {
    accountId: 'eip155:58008:0x3dA3050208a3F2e0d04b33674aAa7b1A9F9B313C',
    mintRecipient: new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 61, 163, 5, 2, 8, 163, 242, 224, 208,
      75, 51, 103, 74, 170, 123, 26, 159, 155, 49, 60,
    ]),
    // verified experimentally
    burnTx:
      'https://mintscan.io/noble-testnet/tx/EF34EA1B0620869DBA191D07F357828F86736E38BBF1A68871570C126BC3479A',
    attestation:
      'https://iris-api-sandbox.circle.com/attestations/0x7fdda79bd91072a047aec03131d35a77fd002b2bde65ed5906bd11a77023bc6c',
  },
  {
    accountId:
      'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K:DRsKHgyrdeySBA7vjoLd9myYSVeU7T2Dkeh6pTm8ycPW',
    mintRecipient: new Uint8Array([
      184, 171, 19, 0, 220, 48, 13, 27, 166, 63, 130, 223, 74, 14, 79, 50, 54,
      171, 220, 245, 113, 108, 79, 231, 48, 127, 30, 138, 24, 49, 45, 181,
    ]),
    burnTx:
      'https://mintscan.io/noble-testnet/tx/E18052508A5FE77C429BC4872A63EF5477E072BECD57EAA38BD12BF4E176C4B1',
    attestation:
      'https://iris-api-sandbox.circle.com/attestations/0xbc1d4e14884ab29b36dd46293de5ef83ed09a44ef699cadef9607f71f3fa9fe5',
  },
];

const mintRecipientMacro = test.macro({
  title(txt = '', { accountId, mintRecipient: _ }) {
    return `CCTP mintRecipient: ${accountId.slice(0, 24)}...`;
  },
  exec(t, { accountId, mintRecipient }) {
    const actual = accountIdTo32Bytes(accountId);
    t.deepEqual(actual, mintRecipient);
  },
});

for (const detail of cctpFixture) {
  test(mintRecipientMacro, detail);
}
