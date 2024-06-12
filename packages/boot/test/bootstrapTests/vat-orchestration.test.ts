import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';

import { toRequestQueryJson } from '@agoric/cosmic-proto';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import type {
  OrchestrationService,
  ICQConnection,
} from '@agoric/orchestration';
import { decodeBase64 } from '@endo/base64';
import { M, matches } from '@endo/patterns';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;

/**
 * To update, pass the message into `makeTxPacket` or `makeQueryPacket` from
 * `@agoric/orchestration`, and paste the resulting `data` key into `protoMsgMocks`
 * in [mocks.js](../../tools/ibc/mocks.js).
 * If adding a new msg, reference the mock in the `sendPacket` switch statement
 * in [supports.ts](../../tools/supports.ts).
 */
const delegateMsgSuccess = Any.toJSON(
  MsgDelegate.toProtoMsg({
    delegatorAddress: 'cosmos1test',
    validatorAddress: 'cosmosvaloper1test',
    amount: { denom: 'uatom', amount: '10' },
  }),
);
const balanceQuery = toRequestQueryJson(
  QueryBalanceRequest.toProtoMsg({
    address: 'cosmos1test',
    denom: 'uatom',
  }),
);

test.before(async t => {
  t.context = await makeWalletFactoryContext(t);

  async function setupDeps() {
    const {
      buildProposal,
      evalProposal,
      runUtils: { EV },
    } = t.context;
    /** ensure orchestration is available */
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

  const orchestration: OrchestrationService =
    await EV.vat('bootstrap').consumeItem('orchestration');

  const account = await EV(orchestration).makeAccount(
    'somechain-1',
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
  t.is(chainAddress.chainId, 'somechain-1');
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
    'somechain-1',
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

  const orchestration: OrchestrationService =
    await EV.vat('bootstrap').consumeItem('orchestration');

  const account = await EV(orchestration).makeAccount(
    'somechain-1',
    'connection-0',
    'connection-0',
  );
  t.truthy(account, 'makeAccount returns an account');

  // @ts-expect-error intentional
  await t.throwsAsync(EV(account).executeEncodedTx('malformed'), {
    message:
      'In "executeEncodedTx" method of (ChainAccountKit account): arg 0: string "malformed" - Must be a copyArray',
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
  );

  await t.throwsAsync(EV(account).executeEncodedTx([delegateMsgFailure]), {
    message: 'ABCI code: 5: error handling packet: see events for details',
  });
});

test('Query connection can be created', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  type Powers = { orchestration: OrchestrationService };
  const contract = async ({ orchestration }: Powers) => {
    const connection =
      await EV(orchestration).provideICQConnection('connection-0');
    t.log('Query Connection', connection);
    t.truthy(connection, 'provideICQConnection returns a connection');
    t.truthy(
      matches(connection, M.remotable('ICQConnection')),
      'ICQConnection is a remotable',
    );
  };

  // core eval context
  {
    const orchestration: OrchestrationService =
      await EV.vat('bootstrap').consumeItem('orchestration');
    await contract({ orchestration });
  }
});

test('Query connection can send a query', async t => {
  const {
    runUtils: { EV },
  } = t.context;

  type Powers = { orchestration: OrchestrationService };
  const contract = async ({ orchestration }: Powers) => {
    const queryConnection: ICQConnection =
      await EV(orchestration).provideICQConnection('connection-0');

    const [result] = await EV(queryConnection).query([balanceQuery]);
    t.is(result.code, 0);
    t.is(result.height, '0'); // bigint
    t.deepEqual(QueryBalanceResponse.decode(decodeBase64(result.key)), {
      balance: {
        amount: '0',
        denom: 'uatom',
      },
    });

    const results = await EV(queryConnection).query([
      balanceQuery,
      balanceQuery,
    ]);
    t.is(results.length, 2);
    for (const { key } of results) {
      t.deepEqual(QueryBalanceResponse.decode(decodeBase64(key)), {
        balance: {
          amount: '0',
          denom: 'uatom',
        },
      });
    }

    await t.throwsAsync(
      EV(queryConnection).query([
        { ...balanceQuery, path: '/cosmos.bank.v1beta1.QueryBalanceRequest' },
      ]),
      {
        message: 'ABCI code: 4: error handling packet: see events for details',
      },
      'Use gRPC method to query, not protobuf typeUrl',
    );
  };

  // core eval context
  {
    const orchestration: OrchestrationService =
      await EV.vat('bootstrap').consumeItem('orchestration');
    await contract({ orchestration });
  }
});

test('provideICQConnection is idempotent', async t => {
  const {
    runUtils: { EV },
  } = t.context;
  const orchestration: OrchestrationService =
    await EV.vat('bootstrap').consumeItem('orchestration');

  const queryConn0 =
    await EV(orchestration).provideICQConnection('connection-0');
  const queryConn1 =
    await EV(orchestration).provideICQConnection('connection-1');
  const queryConn02 =
    await EV(orchestration).provideICQConnection('connection-0');

  const [addr0, addr1, addr02] = await Promise.all([
    EV(queryConn0).getRemoteAddress(),
    EV(queryConn1).getRemoteAddress(),
    EV(queryConn02).getRemoteAddress(),
  ]);
  t.is(addr0, addr02);
  t.not(addr0, addr1);

  const [result] = await EV(queryConn02).query([balanceQuery]);
  t.is(result.code, 0, 'ICQConnectionKit from MapStore state can send queries');
});
