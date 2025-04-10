import '@agoric/swingset-liveslots/tools/prepare-test-env.js';
import test from '@endo/ses-ava/prepare-endo.js';

import { typedJson } from '@agoric/cosmic-proto';
import { makeNameHubKit } from '@agoric/vats';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { objectMap } from '@endo/patterns';
import { withChainCapabilities } from '../../src/chain-capabilities.js';
import { makeChainHub } from '../../src/exos/chain-hub.js';
import knownChains from '../../src/fetched-chain-info.js';
import type {
  CosmosChainAddress,
  DenomAmount,
} from '../../src/orchestration-api.js';
import { assetOn } from '../../src/utils/asset.js';
import { registerChainsAndAssets } from '../../src/utils/chain-hub-helper.js';
import { provideFreshRootZone } from '../durability.js';

// fresh state for each test
const setup = () => {
  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone.subZone('vows'));
  const { nameHub, nameAdmin } = makeNameHubKit();
  const chainHub = makeChainHub(zone.subZone('chainHub'), nameHub, vt);

  return { chainHub, nameAdmin, vt };
};

const [uusdcOnAgoric, agDetail] = assetOn(
  'uusdc',
  'noble',
  undefined,
  'agoric',
  knownChains,
);
const [uusdcOnOsmosis, osDetail] = assetOn(
  'uusdc',
  'noble',
  undefined,
  'osmosis',
  knownChains,
);

test('to issuing chain', async t => {
  const { chainHub } = setup();
  registerChainsAndAssets(
    chainHub,
    {},
    withChainCapabilities(knownChains), // adds pfmEnabled
    harden([
      [uusdcOnAgoric, agDetail],
      [uusdcOnOsmosis, osDetail],
    ]),
  );

  const dest = chainHub.coerceCosmosAddress('noble1234');
  {
    // 100 USDC on agoric -> noble
    const amt: DenomAmount = harden({ denom: uusdcOnAgoric, value: 100n });
    t.deepEqual(chainHub.makeTransferRoute(dest, amt, 'agoric'), {
      receiver: 'noble1234',
      sourceChannel: 'channel-62',
      sourcePort: 'transfer',
      token: {
        amount: '100',
        denom:
          'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
      },
    });
  }
  {
    // 100 USDC on osmosis -> noble
    const amt: DenomAmount = harden({ denom: uusdcOnOsmosis, value: 100n });
    t.deepEqual(chainHub.makeTransferRoute(dest, amt, 'osmosis'), {
      receiver: 'noble1234',
      sourceChannel: 'channel-750',
      sourcePort: 'transfer',
      token: {
        amount: '100',
        denom:
          'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4',
      },
    });
  }
});

test('from issuing chain', async t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    withChainCapabilities(knownChains), // adds pfmEnabled
    harden([assetOn('uist', 'agoric'), assetOn('uosmo', 'osmosis')]),
  );

  const dest = chainHub.coerceCosmosAddress('noble1234');
  {
    // IST on agoric -> noble
    const amt: DenomAmount = harden({ denom: 'uist', value: 100n });
    t.deepEqual(chainHub.makeTransferRoute(dest, amt, 'agoric'), {
      receiver: 'noble1234',
      sourceChannel: 'channel-62',
      sourcePort: 'transfer',
      token: {
        amount: '100',
        denom: 'uist',
      },
    });
  }
  {
    // OSMO on osmosis -> noble
    const amt: DenomAmount = harden({ denom: 'uosmo', value: 100n });
    t.deepEqual(chainHub.makeTransferRoute(dest, amt, 'osmosis'), {
      receiver: 'noble1234',
      sourceChannel: 'channel-750',
      sourcePort: 'transfer',
      token: {
        amount: '100',
        denom: 'uosmo',
      },
    });
  }
});

test('through issuing chain', async t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    withChainCapabilities(knownChains), // adds pfmEnabled
    harden([[uusdcOnAgoric, agDetail]]),
  );

  const dest = chainHub.coerceCosmosAddress('osmo1234');
  const amt: DenomAmount = harden({ denom: uusdcOnAgoric, value: 100n });

  // 100 USDC on agoric -> osmosis
  const route = chainHub.makeTransferRoute(dest, amt, 'agoric');
  t.deepEqual(route, {
    sourcePort: 'transfer',
    sourceChannel: 'channel-62',
    token: {
      amount: '100',
      denom:
        'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
    },
    receiver: 'pfm',
    forwardInfo: {
      forward: {
        receiver: 'osmo1234',
        port: 'transfer',
        channel: 'channel-1',
        retries: 3,
        timeout: '10m',
      },
    },
  });

  // use TransferRoute to build a MsgTransfer
  if (!('forwardInfo' in route)) {
    throw new Error('forwardInfo not returned'); // appease tsc...
  }

  const { forwardInfo, ...rest } = route;
  const transferMsg = typedJson('/ibc.applications.transfer.v1.MsgTransfer', {
    ...rest,
    memo: JSON.stringify(forwardInfo),
    // callers of `.makeTransferRoute` will provide these fields themselves:
    sender: 'agoric123',
    timeoutHeight: {
      revisionHeight: 0n,
      revisionNumber: 0n,
    },
    timeoutTimestamp: 0n,
  });
  t.like(transferMsg, {
    memo: '{"forward":{"receiver":"osmo1234","port":"transfer","channel":"channel-1","retries":3,"timeout":"10m"}}',
    receiver: 'pfm',
  });
});

test('takes forwardOpts', t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    withChainCapabilities(knownChains), // adds pfmEnabled
    harden([[uusdcOnOsmosis, osDetail]]),
  );

  const dest = chainHub.coerceCosmosAddress('agoric1234');
  const amt: DenomAmount = harden({ denom: uusdcOnOsmosis, value: 100n });
  const forwardOpts = harden({
    retries: 1,
    timeout: '3m' as const,
  });

  // 100 USDC on osmosis -> agoric
  const route = chainHub.makeTransferRoute(dest, amt, 'osmosis', forwardOpts);
  t.like(route, {
    sourceChannel: 'channel-750',
    token: {
      denom: uusdcOnOsmosis,
    },
    receiver: 'pfm',
    forwardInfo: {
      forward: {
        channel: 'channel-21',
        ...forwardOpts,
      },
    },
  });

  const nobleAddr = harden({
    value: 'noble1234',
    encoding: 'bech32',
    chainId: 'noble-1',
  } as const);

  t.deepEqual(
    chainHub.makeTransferRoute(dest, amt, 'osmosis', {
      timeout: '99m',
      intermediateRecipient: nobleAddr,
    }),
    {
      receiver: nobleAddr.value,
      sourceChannel: 'channel-750',
      sourcePort: 'transfer',
      forwardInfo: {
        forward: {
          channel: 'channel-21',
          timeout: '99m' as const,
          port: 'transfer',
          receiver: 'agoric1234',
          retries: 3,
        },
      },
      token: {
        amount: '100',
        denom:
          'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4',
      },
    },
    'each field is optional',
  );

  // test that typeGuard works
  t.throws(
    () =>
      chainHub.makeTransferRoute(
        dest,
        amt,
        'osmosis',
        harden({
          ...forwardOpts,
          forward: JSON.stringify('stringified nested forward data'),
        }),
      ),
    { message: /In "makeTransferRoute" method of/ },
  );
});

const nobleDest: CosmosChainAddress = harden({
  value: 'noble1234',
  chainId: 'noble-1',
  encoding: 'bech32',
});

test('no chain info', t => {
  const { chainHub } = setup();

  const amt: DenomAmount = harden({ denom: 'uist', value: 100n });
  t.throws(() => chainHub.makeTransferRoute(nobleDest, amt, 'agoric'), {
    message: 'chain info not found for holding chain: "agoric"',
  });
});

test('no asset info', t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    withChainCapabilities(knownChains), // adds pfmEnabled
    undefined, // do not supply asset info
  );

  t.throws(
    () =>
      chainHub.makeTransferRoute(
        nobleDest,
        harden({ denom: 'uist', value: 100n }),
        'agoric',
      ),
    {
      message:
        'no denom detail for: "uist" on "agoric". ensure it is registered in chainHub.',
    },
  );

  t.throws(
    () =>
      chainHub.makeTransferRoute(
        nobleDest,
        harden({ denom: uusdcOnAgoric, value: 100n }),
        'agoric',
      ),
    {
      message:
        'no denom detail for: "ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9" on "agoric". ensure it is registered in chainHub.',
    },
  );
});

const knownChainsSansConns = objectMap(
  withChainCapabilities(knownChains),
  ({ connections, ...rest }) => rest,
);

test('no connection info single hop', t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    knownChainsSansConns, // omit connections
    harden([
      [uusdcOnAgoric, agDetail],
      [uusdcOnOsmosis, osDetail],
    ]),
  );

  t.throws(
    () =>
      chainHub.makeTransferRoute(
        nobleDest,
        harden({ denom: uusdcOnAgoric, value: 100n }),
        'agoric',
      ),
    { message: 'no connection info found for "agoric-3"<->"noble-1"' },
  );
});

test('no connection info multi hop', t => {
  const { chainHub } = setup();

  // only agoric has connection info; osmosis<>noble will be missing
  const chainInfo = { ...knownChainsSansConns, agoric: knownChains.agoric };
  registerChainsAndAssets(
    chainHub,
    {},
    harden(chainInfo),
    harden([
      [uusdcOnAgoric, agDetail],
      [uusdcOnOsmosis, osDetail],
    ]),
  );

  const osmoDest = chainHub.coerceCosmosAddress('osmo1234');
  const agoricDest = chainHub.coerceCosmosAddress('agoric1234');

  t.throws(
    () =>
      chainHub.makeTransferRoute(
        osmoDest,
        harden({ denom: uusdcOnAgoric, value: 100n }),
        'agoric',
      ),
    { message: 'no connection info found for "noble-1"<->"osmosis-1"' },
  );

  // transfer USDC on osmosis to agoric
  t.throws(
    () =>
      chainHub.makeTransferRoute(
        agoricDest,
        harden({ denom: uusdcOnOsmosis, value: 100n }),
        'osmosis',
      ),
    { message: 'no connection info found for "osmosis-1"<->"noble-1"' },
  );
});

test('asset not on holding chain', t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    withChainCapabilities(knownChains),
    harden([[uusdcOnAgoric, agDetail]]),
  );

  // transfer USDC on agoric from osmosis to noble (impossible)
  t.throws(
    () =>
      chainHub.makeTransferRoute(
        nobleDest,
        harden({ denom: uusdcOnAgoric, value: 100n }),
        'osmosis',
      ),
    {
      message:
        'no denom detail for: "ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9" on "osmosis". ensure it is registered in chainHub.',
    },
  );
});

test('no PFM path', t => {
  const { chainHub } = setup();

  registerChainsAndAssets(
    chainHub,
    {},
    knownChains, // intentionally omit pfmEnabled
    harden([[uusdcOnAgoric, agDetail]]),
  );

  // transfer USDC on agoric to osmosis
  t.throws(
    () =>
      chainHub.makeTransferRoute(
        chainHub.coerceCosmosAddress('osmo1234'),
        harden({ denom: uusdcOnAgoric, value: 100n }),
        'agoric',
      ),
    { message: 'pfm not enabled on issuing chain: "noble"' },
  );
});
