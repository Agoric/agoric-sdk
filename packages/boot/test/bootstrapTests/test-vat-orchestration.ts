import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';

import type { AnyJson } from '@agoric/cosmic-proto';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import type { ChainAccount, OrchestrationService } from '@agoric/orchestration';
import { decodeBase64 } from '@endo/base64';
import { M, matches } from '@endo/patterns';
import { makeWalletFactoryContext } from './walletFactory.ts';

const makeTestContext = async (t: ExecutionContext) =>
  makeWalletFactoryContext(t);

type DefaultTestContext = Awaited<ReturnType<typeof makeTestContext>>;
const test: TestFn<DefaultTestContext> = anyTest;

/**
 * To update, pass the message into `makeTxPacket` from `@agoric/orchestration`,
 *  and paste the resulting `data` key into `protoMsgMocks` in
 * [mocks.js](../../tools/ibc/mocks.js).
 * If adding a new msg, reference the mock in the `sendPacket` switch statement
 * in [supports.ts](../../tools/supports.ts).
 */
const delegateMsgSuccess = Any.toJSON(
  MsgDelegate.toProtoMsg({
    delegatorAddress: 'cosmos1test',
    validatorAddress: 'cosmosvaloper1test',
    amount: { denom: 'uatom', amount: '10' },
  }),
) as AnyJson;

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

test('makeAccount returns an ICA connection', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  const orchestration = await EV.vat('bootstrap').consumeItem('orchestration');

  const account = await EV(orchestration).makeAccount(
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'makeAccount returns an account');
  t.truthy(
    matches(account, M.remotable('ChainAccount')),
    'account is a remotable',
  );
  const [remoteAddress, localAddress, chainAddress, port] = await Promise.all([
    EV(account).getRemoteAddress(),
    EV(account).getLocalAddress(),
    EV(account).getAddress(),
    EV(account).getPort(),
  ]);
  t.regex(remoteAddress, /icahost/);
  t.regex(localAddress, /icacontroller/);
  t.regex(chainAddress.address, /cosmos1/);
  t.regex(chainAddress.chainId, /FIXME/); // TODO, use a real chainId #9063
  t.truthy(matches(port, M.remotable('Port')));
  t.log('ICA Account Addresses', {
    remoteAddress,
    localAddress,
    chainAddress,
  });
});

test('ICA connection can be closed', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  const orchestration: OrchestrationService =
    await EV.vat('bootstrap').consumeItem('orchestration');

  const account = await EV(orchestration).makeAccount(
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'makeAccount returns an account');

  await EV(account).close();

  await t.throwsAsync(EV(account).executeEncodedTx([delegateMsgSuccess]), {
    message: 'Connection closed',
  });
});

test('ICA connection can send msg with proto3', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  const orchestration = await EV.vat('bootstrap').consumeItem('orchestration');

  const account: ChainAccount = await EV(orchestration).makeAccount(
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'makeAccount returns an account');

  // @ts-expect-error intentional
  await t.throwsAsync(EV(account).executeEncodedTx('malformed'), {
    message:
      'In "executeEncodedTx" method of (ChainAccount account): arg 0: string "malformed" - Must be a copyArray',
  });

  const txSuccess = await EV(account).executeEncodedTx([delegateMsgSuccess]);
  t.is(
    txSuccess,
    'Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U=', // cosmos.staking.v1beta1.MsgDelegateResponse
    'delegateMsgSuccess',
  );
  t.deepEqual(
    MsgDelegateResponse.decode(decodeBase64(txSuccess)),
    {},
    'success tx',
  );

  const txWithOptions = await EV(account).executeEncodedTx(
    [delegateMsgSuccess],
    // @ts-expect-error XXX TxBody interface
    {
      memo: 'TESTING',
      timeoutHeight: 1_000_000_000n,
    },
  );
  t.deepEqual(
    MsgDelegateResponse.decode(decodeBase64(txWithOptions)),
    {},
    'txWithOptions',
  );

  const delegateMsgFailure = Any.toJSON(
    MsgDelegate.toProtoMsg({
      delegatorAddress: 'cosmos1fail',
      validatorAddress: 'cosmosvaloper1fail',
      amount: { denom: 'uatom', amount: '10' },
    }),
  ) as AnyJson;

  await t.throwsAsync(EV(account).executeEncodedTx([delegateMsgFailure]), {
    message: 'ABCI code: 5: error handling packet: see events for details',
  });
});
