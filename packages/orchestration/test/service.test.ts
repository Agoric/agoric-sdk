import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { toRequestQueryJson } from '@agoric/cosmic-proto';
import { QueryBalanceRequest } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { E } from '@endo/far';
import { commonSetup } from './supports.js';

test('makeICQConnection returns an ICQConnection', async t => {
  const {
    bootstrap: { orchestration },
  } = await commonSetup(t);

  const CONNECTION_ID = 'connection-0';

  const icqConnection =
    await E(orchestration).provideICQConnection(CONNECTION_ID);
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
    new RegExp(`/ibc-hop/${CONNECTION_ID}`),
    'remote address contains provided connectionId',
  );
  t.regex(
    remoteAddr,
    /icqhost\/unordered\/icq-1/,
    'remote address contains icqhost port, unordered ordering, and icq-1 version string',
  );

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

test.todo('makeAccount');
