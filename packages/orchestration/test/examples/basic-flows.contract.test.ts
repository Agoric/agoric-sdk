import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { E, getInterfaceOf } from '@endo/far';
import path from 'path';
import { JsonSafe, toRequestQueryJson } from '@agoric/cosmic-proto';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { ResponseQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { decodeBase64 } from '@endo/base64';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'basic-flows';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn =
  typeof import('../../src/examples/basic-flows.contract.js').start;

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

const chainConfigs = {
  agoric: { expectedAddress: 'agoric1fakeLCAAddress' },
  cosmoshub: { expectedAddress: 'cosmos1test' },
  osmosis: { expectedAddress: 'osmo1test' },
};

const orchestrationAccountScenario = test.macro({
  title: (_, chainName: string) =>
    `orchestrate - ${chainName} makeOrchAccount returns a ContinuingOfferResult`,
  exec: async (t, chainName: string) => {
    const config = chainConfigs[chainName as keyof typeof chainConfigs];
    if (!config) {
      return t.fail(`Unknown chain: ${chainName}`);
    }

    const {
      bootstrap: { vowTools: vt },
      zoe,
      instance,
    } = t.context;
    const publicFacet = await E(zoe).getPublicFacet(instance);
    const inv = E(publicFacet).makeOrchAccountInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, { chainName });
    const { invitationMakers, publicSubscribers } = await vt.when(
      E(userSeat).getOfferResult(),
    );

    t.regex(getInterfaceOf(invitationMakers)!, /invitationMakers/);

    const { description, storagePath, subscriber } = publicSubscribers.account;
    t.regex(description!, /Account holder/);

    const expectedStoragePath = `mockChainStorageRoot.basic-flows.${config.expectedAddress}`;
    t.is(storagePath, expectedStoragePath);

    t.regex(getInterfaceOf(subscriber)!, /Durable Publish Kit subscriber/);
  },
});

test(orchestrationAccountScenario, 'agoric');
test(orchestrationAccountScenario, 'cosmoshub');

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
    const offerResult = await vt.when(E(userSeat).getOfferResult());
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
});

test('send query from orch account in an async-flow', async t => {
  const {
    bootstrap: { vowTools: vt },
    zoe,
    instance,
    utils: { inspectDibcBridge },
  } = t.context;
  const publicFacet = await E(zoe).getPublicFacet(instance);

  {
    t.log('send query from orchAccount on chain with icqEnabled: true');
    const inv = E(publicFacet).makeAccountAndSendBalanceQueryInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, {
      chainName: 'osmosis',
      denom: 'uatom',
    });
    const offerResult = await vt.when(E(userSeat).getOfferResult());
    t.deepEqual(offerResult, {
      value: 0n,
      denom: 'uatom',
    });
  }
  {
    t.log('send query from orchAccount that times out');
    const inv = E(publicFacet).makeAccountAndSendBalanceQueryInvitation();
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
    const inv = E(publicFacet).makeAccountAndSendBalanceQueryInvitation();
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
});

// needs design?
test.todo('send query LocalChainFacade');
