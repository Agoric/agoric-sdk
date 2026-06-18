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
import type { ExecutionContext, TestFn } from 'ava';
import {
  insistManagerType,
  makeSwingsetHarness,
} from '../../tools/supports.js';
import {
  makeBootTestContext,
  withWalletFactory,
  type WalletFactoryBootTestContext,
} from '../tools/boot-test-context.js';

type ChainInfoContext = {
  harness?: ReturnType<typeof makeSwingsetHarness>;
  makeBootContext: (
    t: ExecutionContext<unknown>,
  ) => Promise<WalletFactoryBootTestContext>;
};

const test: TestFn<ChainInfoContext> = anyTest;

const ATOM_DENOM = 'uatom';

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before(async t => {
  const managerType = defaultManagerType;
  insistManagerType(managerType);

  const harness = managerType === 'xsnap' ? makeSwingsetHarness() : undefined;

  const makeBootContext = async (t0: ExecutionContext<unknown>) =>
    withWalletFactory(
      await makeBootTestContext(t0, {
        configSpecifier:
          '@agoric/vm-config/decentral-itest-orchestration-chains-config.json',
        slogFile,
        defaultManagerType: managerType,
        harness,
      }),
    );

  t.context = { harness, makeBootContext };
});

/**
 * Verify the orchestration-chains config publishes the expected `chain` and
 * `chainConnection` info to `agoricNames`. The companion `revise chain info`
 * test lives in revise-chain-info.test.ts so the two boots run on separate
 * cores.
 */
test('config', async t => {
  const ctx = await t.context.makeBootContext(t);
  t.teardown(async () => ctx.shutdown());

  const {
    storage,
    readPublished,
    runUtils: { EV },
  } = ctx;

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
