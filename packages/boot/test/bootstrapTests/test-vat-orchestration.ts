import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';
import { M, matches } from '@endo/patterns';
import { makeWalletFactoryContext } from './walletFactory.ts';

const makeTestContext = async (t: ExecutionContext) =>
  makeWalletFactoryContext(t);

type DefaultTestContext = Awaited<ReturnType<typeof makeTestContext>>;
const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => {
  t.context = await makeTestContext(t);

  async function setupDeps() {
    const {
      buildProposal,
      evalProposal,
      runUtils: { EV },
    } = t.context;
    /** ensure network, ibc, and orchestration are available */
    await evalProposal(
      buildProposal('@agoric/builders/scripts/vats/init-network.js'),
    );
    await evalProposal(
      buildProposal('@agoric/builders/scripts/vats/init-orchestration.js'),
    );
    const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
    t.true(await EV(vatStore).has('ibc'), 'ibc');
    t.true(await EV(vatStore).has('network'), 'network');
    t.true(await EV(vatStore).has('orchestration'), 'orchestration');
  }

  await setupDeps();
});

test.after.always(t => t.context.shutdown?.());

test('createAccount returns an ICA connection', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  const orchestration = await EV.vat('bootstrap').consumeItem('orchestration');

  const account = await EV(orchestration).createAccount(
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'createAccount returns an account');
  t.truthy(
    matches(account, M.remotable('ChainAccount')),
    'account is a remotable',
  );
  const [remoteAddress, localAddress, accountAddress, port] = await Promise.all(
    [
      EV(account).getRemoteAddress(),
      EV(account).getLocalAddress(),
      EV(account).getAccountAddress(),
      EV(account).getPort(),
    ],
  );
  t.regex(remoteAddress, /icahost/);
  t.regex(localAddress, /icacontroller/);
  t.regex(accountAddress, /osmo1/);
  t.truthy(matches(port, M.remotable('Port')));
  t.log('ICA Account Addresses', {
    remoteAddress,
    localAddress,
    accountAddress,
  });
});

test('ICA connection can be closed', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  const orchestration = await EV.vat('bootstrap').consumeItem('orchestration');

  const account = await EV(orchestration).createAccount(
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'createAccount returns an account');

  const res = await EV(account).close();
  t.is(res, 'Connection closed');
});
