/**
 * @file Tests revising `chain` and `chainConnection` info in `agoricNames`.
 *
 * Split from vstorage-chain-info.test.ts so this boot runs in its own AVA
 * worker (i.e. its own core) concurrently with the `config` boot rather than
 * after it. The two tests each start an independent swingset and share no
 * state, so there is no ordering dependency between them.
 *
 * Not currently planned for mainnet.
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

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

test('revise chain info', async t => {
  const ctx = await t.context.makeBootContext(t);
  t.teardown(async () => ctx.shutdown());

  const {
    applyProposal,
    runUtils: { EV },
  } = ctx;

  await applyProposal('@agoric/builders/scripts/testing/append-chain-info.js');

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');

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
