/**
 * @file Tests publishing of `chain` and `chainConnection` info to `agoricNames`.
 *
 * Not currently planned for mainnet.
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  defaultMarshaller,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import type { TestFn } from 'ava';
import {
  insistManagerType,
  makeSwingsetHarness,
} from '../../tools/supports.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';

const test: TestFn<
  WalletFactoryTestContext & {
    harness?: ReturnType<typeof makeSwingsetHarness>;
  }
> = anyTest;

const ATOM_DENOM = 'uatom';

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before(async t => {
  insistManagerType(defaultManagerType);
  const harness =
    defaultManagerType === 'xsnap' ? makeSwingsetHarness() : undefined;
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-chains-config.json',
    { slogFile, defaultManagerType, harness },
  );
  t.context = { ...ctx, harness };
});
test.after.always(t => t.context.shutdown?.());

/**
 * Test the config itself. Part of this suite so we don't have to start up another swingset.
 */
test.serial('config', async t => {
  const {
    storage,
    readPublished,
    runUtils: { EV },
  } = t.context;

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');

  {
    const cosmosChainInfo = await EV(agoricNames).lookup('chain', 'cosmoshub');
    t.like(cosmosChainInfo, {
      chainId: 'cosmoshub-4',
      stakingTokens: [{ denom: ATOM_DENOM }],
    });
    t.deepEqual(readPublished(`agoricNames.chain.cosmoshub`), cosmosChainInfo);
    await documentStorageSchema(t, storage, {
      note: 'Chain info for Orchestration',
      node: 'agoricNames.chain',
      showValue: v => defaultMarshaller.fromCapData(JSON.parse(v)),
    });
  }

  {
    const connection = await EV(agoricNames).lookup(
      'chainConnection',
      'cosmoshub-4_juno-1',
    );
    t.like(connection, {
      state: 3,
      transferChannel: { portId: 'transfer', state: 3 },
    });

    t.deepEqual(
      readPublished(`agoricNames.chainConnection.cosmoshub-4_juno-1`),
      connection,
    );

    await documentStorageSchema(t, storage, {
      note: 'Chain connections for Orchestration',
      node: 'agoricNames.chainConnection',
      showValue: v => defaultMarshaller.fromCapData(JSON.parse(v)),
    });
  }
  {
    const connection = await EV(agoricNames).lookup(
      'chainConnection',
      'agoric-3_osmosis-1',
    );
    t.like(connection, {
      id: 'connection-1',
      client_id: '07-tendermint-1',
      counterparty: {
        client_id: '07-tendermint-2109',
        connection_id: 'connection-1649',
      },
      transferChannel: {
        counterPartyChannelId: 'channel-320',
        channelId: 'channel-1',
      },
    });
  }
});

// XXX rely on .serial to be in sequence, and keep this one last
test.serial('revise chain info', async t => {
  const {
    buildProposal,
    evalProposal,
    runUtils: { EV },
  } = t.context;

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');

  await t.throwsAsync(EV(agoricNames).lookup('chain', 'hot'), {
    message: '"nameKey" not found: "hot"',
  });

  // Revise chain info in agoricNames with the fixture in this script
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/append-chain-info.js'),
  );

  const hotchain = await EV(agoricNames).lookup('chain', 'hot');
  t.deepEqual(hotchain, {
    bech32Prefix: 'cosmos',
    chainId: 'hot-1',
    namespace: 'cosmos',
    reference: 'hot-1',
  });

  const connection = await EV(agoricNames).lookup(
    'chainConnection',
    'cosmoshub-4_hot-1',
  );
  t.like(connection, {
    id: 'connection-1',
    client_id: '07-tendermint-2',
  });
});
