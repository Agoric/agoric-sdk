import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { decodeBase64 } from '@endo/base64';
import { M, matches } from '@endo/patterns';
import { txToBase64 } from '@agoric/orchestration';
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

test('ICA connection can send msg with proto3', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  const orchestration = await EV.vat('bootstrap').consumeItem('orchestration');

  /** @type {ChainAccount} */
  const account = await EV(orchestration).createAccount(
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'createAccount returns an account');

  await t.throwsAsync(EV(account).executeEncodedTx('malformed'), {
    message:
      'In "executeEncodedTx" method of (ChainAccount account): arg 0: string "malformed" - Must be a copyArray',
  });

  // marked success in [support.ts](../tools/support.ts) based on the packets `data` key
  // the whole tx packet bytes needs to be added, not just the message bytes
  const delegateMsgSuccess = txToBase64(
    MsgDelegate.toProtoMsg({
      delegatorAddress:
        'osmo1wh2yvlj26dzuwu54vnm7lnu0q7znjru8r8dzdam6k6yunnmkduds6p25l7',
      validatorAddress: 'osmovaloper1qjtcxl86z0zua2egcsz4ncff2gzlcndzs93m43',
      amount: { denom: 'uosmo', amount: '10' },
    }),
  );

  const txSuccess = await EV(account).executeEncodedTx(
    harden([delegateMsgSuccess]),
  );
  t.is(
    txSuccess,
    // cosmos.staking.v1beta1.MsgDelegateResponse
    `{"result":"Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U="}`,
  );
  t.deepEqual(
    MsgDelegateResponse.decode(decodeBase64(JSON.parse(txSuccess).result)),
    {},
    'success tx',
  );

  const txWithOptions = await EV(account).executeEncodedTx(
    harden([delegateMsgSuccess]),
    harden({
      memo: 'TESTING',
      // TODO, can we mock/simulate this for a test?
      timeoutHeight: 1_000_000_000n,
    }),
  );
  t.deepEqual(
    MsgDelegateResponse.decode(decodeBase64(JSON.parse(txWithOptions)?.result)),
    {},
    'success tx with options',
  );

  const delegateMsgFailure = txToBase64(
    MsgDelegate.toProtoMsg({
      delegatorAddress: 'osmo1',
      validatorAddress: 'osmvaloper1',
      amount: { denom: 'uosmo', amount: '10' },
    }),
  );

  // XXX can we change executeEncodedTx behavior to reliably expect `result` | `erorr`?
  const txFailure = await EV(account).executeEncodedTx(
    harden([delegateMsgFailure]),
  );
  t.is(
    txFailure,
    `{"error":"ABCI code: 5: error handling packet: see events for details"}`,
  );
});
