import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { E } from '@endo/far';
import path from 'path';
import { JsonSafe, toRequestQueryJson, typedJson } from '@agoric/cosmic-proto';
import {
  QueryAllBalancesRequest,
  QueryAllBalancesResponse,
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { ResponseQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { decodeBase64 } from '@endo/base64';
import {
  LOCALCHAIN_DEFAULT_ADDRESS,
  LOCALCHAIN_QUERY_ALL_BALANCES_RESPONSE,
} from '@agoric/vats/tools/fake-bridge.js';
import { commonSetup } from '../supports.js';
import { defaultMockAckMap } from '../ibc-mocks.js';
import {
  buildQueryPacketString,
  buildQueryResponseString,
} from '../../tools/ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'query-flows';
const contractFile = `${dirname}/../../src/fixtures/query-flows.contract.js`;
type StartFn =
  typeof import('../../src/fixtures/query-flows.contract.js').start;

type TestContext = Awaited<ReturnType<typeof commonSetup>> & {
  zoe: ZoeService;
  instance: Instance<StartFn>;
};

const test = anyTest as TestFn<TestContext>;

const decodeBalanceQueryResponse = (results: JsonSafe<ResponseQuery>[]) =>
  results.map(({ key }) => QueryBalanceResponse.decode(decodeBase64(key)));

test.beforeEach(async t => {
  const setupContext = await commonSetup(t);
  const {
    bootstrap: { storage },
    commonPrivateArgs,
  } = setupContext;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);
  const installation = await bundleAndInstall(contractFile);

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const { instance } = await E(zoe).startInstance(
    installation,
    undefined,
    {},
    { ...commonPrivateArgs, storageNode },
  );

  t.context = {
    ...setupContext,
    zoe,
    instance,
  };
});

test('send query from chain object', async t => {
  const {
    bootstrap: { vowTools: vt },
    zoe,
    instance,
    utils: { inspectDibcBridge },
  } = t.context;
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const balanceQuery = toRequestQueryJson(
    QueryBalanceRequest.toProtoMsg({
      address: 'cosmos1test',
      denom: 'uatom',
    }),
  );
  {
    t.log('send query on chain with icqEnabled: true');
    const inv = E(publicFacet).makeSendICQQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
      msgs: [balanceQuery],
    });
    const offerResultString = await vt.when(E(userSeat).getOfferResult());
    const offerResult = JSON.parse(offerResultString);
    t.log(offerResult);
    t.assert(offerResult[0].key, 'base64 encoded response returned');
    const decodedResponse = decodeBalanceQueryResponse(offerResult);
    t.deepEqual(decodedResponse, [
      {
        balance: {
          amount: '0',
          denom: 'uatom',
        },
      },
    ]);
  }
  {
    t.log('send query on chain with icqEnabled: false');
    const inv = E(publicFacet).makeSendICQQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'cosmoshub',
      msgs: [balanceQuery],
    });
    await t.throwsAsync(vt.when(E(userSeat).getOfferResult()), {
      message: 'Queries not available for chain "cosmoshub-4"',
    });
  }
  {
    t.log('sending subsequent queries should not result in new ICQ channels');
    const inv = E(publicFacet).makeSendICQQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
      msgs: [balanceQuery],
    });
    await vt.when(E(userSeat).getOfferResult());
    const { bridgeDowncalls } = await inspectDibcBridge();

    const portBindings = bridgeDowncalls.filter(x => x.method === 'bindPort');
    t.is(portBindings.length, 1, 'only one port bound');
    t.regex(portBindings?.[0]?.packet.source_port, /icqcontroller-/);
    const icqChannelInits = bridgeDowncalls.filter(
      x => x.method === 'startChannelOpenInit' && x.version === 'icq-1',
    );
    t.is(icqChannelInits.length, 1, 'only one ICQ channel opened');
    const sendPacketCalls = bridgeDowncalls.filter(
      x =>
        x.method === 'sendPacket' && x.packet.source_port === 'icqcontroller-1',
    );
    t.is(sendPacketCalls.length, 2, 'sent two queries');
  }
  const proto3JsonQuery = typedJson(
    '/cosmos.bank.v1beta1.QueryAllBalancesRequest',
    {
      address: LOCALCHAIN_DEFAULT_ADDRESS,
    },
  );
  {
    t.log('send a query from the localchain');
    const inv = E(publicFacet).makeSendLocalQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      msgs: [proto3JsonQuery],
    });
    const offerResultString = await vt.when(E(userSeat).getOfferResult());
    const offerResult = JSON.parse(offerResultString);
    t.log(offerResult);
    t.deepEqual(
      offerResult,
      [
        {
          error: '',
          height: '1',
          reply: {
            '@type': '/cosmos.bank.v1beta1.QueryAllBalancesResponse',
            balances: [
              { denom: 'ubld', amount: '10' },
              { denom: 'uist', amount: '10' },
            ],
            pagination: {
              nextKey: null,
              total: '2',
            },
          },
        },
      ],
      'balances returned',
    );
  }
  {
    t.log('remote chain facade guards offer with M.arrayOf(ICQMsgShape)');
    const inv = E(publicFacet).makeSendICQQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
      // @ts-expect-error intentional error
      msgs: [proto3JsonQuery],
    });
    await t.throwsAsync(vt.when(E(userSeat).getOfferResult()), {
      message: /.*Must have missing properties \["path","data"\]/,
    });
  }
});

test('send query from orch account in an async-flow', async t => {
  const {
    bootstrap: { vowTools: vt },
    zoe,
    instance,
    mocks: { ibcBridge },
    utils: { inspectDibcBridge },
  } = t.context;
  const publicFacet = await E(zoe).getPublicFacet(instance);

  {
    t.log('send query from orchAccount on chain with icqEnabled: true');
    const inv = E(publicFacet).makeAccountAndGetBalanceQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
      denom: 'uatom',
    });
    const offerResultString = await vt.when(E(userSeat).getOfferResult());
    const offerResult = JSON.parse(offerResultString);
    t.deepEqual(offerResult, {
      value: '[0n]',
      denom: 'uatom',
    });
  }
  {
    t.log('send query from orchAccount that times out');
    const inv = E(publicFacet).makeAccountAndGetBalanceQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
      denom: 'notarealdenom',
    });
    await t.throwsAsync(vt.when(E(userSeat).getOfferResult()), {
      message: 'ABCI code: 5: error handling packet: see events for details',
    });
  }
  {
    t.log('send query from orchAccount on chain with icqEnabled: false');
    const inv = E(publicFacet).makeAccountAndGetBalanceQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'cosmoshub',
      denom: 'uatom,',
    });
    await t.throwsAsync(vt.when(E(userSeat).getOfferResult()), {
      message: 'Queries not available for chain "cosmoshub-4"',
    });
  }

  t.log("creating add'l account should not result in new ICQ channels");
  const { bridgeDowncalls } = await inspectDibcBridge();
  const icqPortBindings = bridgeDowncalls.filter(
    x =>
      x.method === 'bindPort' && x.packet.source_port.includes('icqcontroller'),
  );
  t.is(icqPortBindings.length, 1, 'only one icq port bound');
  const icqChannelInits = bridgeDowncalls.filter(
    x => x.method === 'startChannelOpenInit' && x.version === 'icq-1',
  );
  t.is(icqChannelInits.length, 1, 'only one ICQ channel opened');

  {
    t.log(
      'send allBalances query from orchAccount on chain with icqEnabled: true',
    );
    const [query, ack] = [
      buildQueryPacketString([
        QueryAllBalancesRequest.toProtoMsg({
          address: 'osmo1test3',
        }),
      ]),
      buildQueryResponseString(QueryAllBalancesResponse, {
        balances: [],
      }),
    ];
    ibcBridge.setAddressPrefix('osmo');
    ibcBridge.setMockAck({
      ...defaultMockAckMap,
      [query]: ack,
    });
    const inv = E(publicFacet).makeAccountAndGetBalancesQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
    });
    const offerResultString = await vt.when(E(userSeat).getOfferResult());
    const offerResult = JSON.parse(offerResultString);
    t.deepEqual(offerResult, []);
  }

  {
    t.log('send balance query from localOrchAccount');
    const inv = E(publicFacet).makeAccountAndGetBalanceQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'agoric',
      denom: 'ibc/idk',
    });
    const offerResultString = await vt.when(E(userSeat).getOfferResult());
    const offerResult = JSON.parse(offerResultString);
    t.deepEqual(offerResult, {
      // fake bridge mocked to return 10n for all denoms
      value: '[10n]',
      denom: 'ibc/idk',
    });
  }
  {
    t.log('send allBalances query from localOrchAccount');
    const inv = E(publicFacet).makeAccountAndGetBalancesQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'agoric',
    });
    const offerResultString = await vt.when(E(userSeat).getOfferResult());
    const offerResult = JSON.parse(offerResultString);
    const expectedBalances = LOCALCHAIN_QUERY_ALL_BALANCES_RESPONSE.map(x => ({
      ...x,
      value: `[${x.value}n]`,
    }));
    t.deepEqual(offerResult, expectedBalances);
  }
});
