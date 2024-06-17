import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { toRequestQueryJson } from '@agoric/cosmic-proto';
import { QueryBalanceRequest } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { MsgDelegate } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { matches } from '@endo/patterns';
import { commonSetup } from './supports.js';
import { ChainAddressShape } from '../src/typeGuards.js';

test('makeICQConnection returns an ICQConnection', async t => {
  const {
    bootstrap: { orchestration },
  } = await commonSetup(t);

  const CONTROLLER_CONNECTION_ID = 'connection-0';

  const icqConnection = await E(orchestration).provideICQConnection(
    CONTROLLER_CONNECTION_ID,
  );
  const [localAddr, remoteAddr] = await Promise.all([
    E(icqConnection).getLocalAddress(),
    E(icqConnection).getRemoteAddress(),
  ]);
  t.log(icqConnection, {
    localAddr,
    remoteAddr,
  });
  t.regex(localAddr, /ibc-port\/icqcontroller-\d+/);
  t.regex(
    remoteAddr,
    new RegExp(`/ibc-hop/${CONTROLLER_CONNECTION_ID}`),
    'remote address contains provided connectionId',
  );
  t.regex(
    remoteAddr,
    /icqhost\/unordered\/icq-1/,
    'remote address contains icqhost port, unordered ordering, and icq-1 version string',
  );

  const icqConnection2 = await E(orchestration).provideICQConnection(
    CONTROLLER_CONNECTION_ID,
  );
  const localAddr2 = await E(icqConnection2).getLocalAddress();
  t.is(localAddr, localAddr2, 'provideICQConnection is idempotent');

  await t.throwsAsync(
    E(icqConnection).query([
      toRequestQueryJson(
        QueryBalanceRequest.toProtoMsg({
          address: 'cosmos1test',
          denom: 'uatom',
        }),
      ),
    ]),
    { message: /"data":"(.*)"memo":""/ },
    'TODO do not use echo connection',
  );
});

test('makeAccount returns a ChainAccount', async t => {
  const {
    bootstrap: { orchestration },
  } = await commonSetup(t);

  const CHAIN_ID = 'cosmoshub-99';
  const HOST_CONNECTION_ID = 'connection-0';
  const CONTROLLER_CONNECTION_ID = 'connection-1';

  const account = await E(orchestration).makeAccount(
    CHAIN_ID,
    HOST_CONNECTION_ID,
    CONTROLLER_CONNECTION_ID,
  );
  const [localAddr, remoteAddr, chainAddr] = await Promise.all([
    E(account).getLocalAddress(),
    E(account).getRemoteAddress(),
    E(account).getAddress(),
  ]);
  t.log(account, {
    localAddr,
    remoteAddr,
    chainAddr,
  });
  t.regex(localAddr, /ibc-port\/icacontroller-\d+/);
  t.regex(
    remoteAddr,
    new RegExp(`/ibc-hop/${CONTROLLER_CONNECTION_ID}`),
    'remote address contains provided connectionId',
  );
  t.regex(
    remoteAddr,
    /icahost\/ordered/,
    'remote address contains icahost port, ordered ordering',
  );
  t.regex(
    remoteAddr,
    /"version":"ics27-1"(.*)"encoding":"proto3"/,
    'remote address contains version and encoding in version string',
  );

  t.true(matches(chainAddr, ChainAddressShape));
  t.regex(
    chainAddr.address,
    /UNPARSABLE_CHAIN_ADDRESS/,
    'TODO use mocked ibc connection instead of echo connection',
  );

  const delegateMsg = Any.toJSON(
    MsgDelegate.toProtoMsg({
      delegatorAddress: 'cosmos1test',
      validatorAddress: 'cosmosvaloper1test',
      amount: { denom: 'uatom', amount: '10' },
    }),
  );
  await t.throwsAsync(
    E(account).executeEncodedTx([delegateMsg]),
    { message: /"type":1(.*)"data":"(.*)"memo":""/ },
    'TODO do not use echo connection',
  );

  await E(account).close();
  await t.throwsAsync(
    E(account).executeEncodedTx([delegateMsg]),
    {
      message: 'Connection closed',
    },
    'cannot execute transaction if connection is closed',
  );
});
