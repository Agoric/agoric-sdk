// @ts-check
/* global globalThis */
import anyTest from 'ava';
import {
  createProtobufRpcClient,
  QueryClient,
  setupBankExtension,
} from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { QueryClientImpl } from '@agoric/cosmic-proto/vstorage/query.js';

import { makeHttpClient } from '../src/makeHttpClient.js';
import { captureIO, web1, web2 } from './net-access-fixture.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = /** @type {any} */ (anyTest);

/** @param {Map<string, any>} web */
const replayIO = web => {
  // tendermint-rpc generates ids using ambient access to Math.random()
  // So we normalize them to sequence numbers.
  let nextID = 0;
  const normalizeID = data =>
    data.replace(/\\"id\\":\d+/, `\\"id\\":${nextID}`);

  /** @type {typeof window.fetch} */
  // @ts-expect-error mock
  const f = async (...args) => {
    nextID += 1;
    const key = normalizeID(JSON.stringify(args));
    const data = web.get(key);
    if (!data) throw Error(`no data for ${key}`);
    return {
      json: async () => data,
    };
  };
  return f;
};

const makeTestContext = async () => {
  return { fetch: globalThis.fetch };
};

test.before(async t => {
  t.context = await makeTestContext();
});

const scenario1 = {
  endpoint: 'https://emerynet.rpc.agoric.net/',
  request: {
    id: 1,
    method: 'no-such-method',
    params: [],
  },
  gov2: {
    addr: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    balance: { amount: '25050000', denom: 'uist' },
  },
};

test('interpose net access', async t => {
  const fetchMock = replayIO(web1);
  const rpcClient = makeHttpClient(scenario1.endpoint, fetchMock);

  t.log('raw JSON RPC');
  const res = await rpcClient.execute({
    ...scenario1.request,
    jsonrpc: '2.0',
  });
  t.like(res, { error: { message: 'Method not found' } });

  t.log('Cosmos SDK RPC: balance query');
  const tmClient = await Tendermint34Client.create(rpcClient);
  const qClient = new QueryClient(tmClient);
  const ext = setupBankExtension(qClient);
  const actual = await ext.bank.balance(
    scenario1.gov2.addr,
    scenario1.gov2.balance.denom,
  );

  t.deepEqual(actual, scenario1.gov2.balance);
});

const scenario2 = {
  endpoint: 'https://emerynet.rpc.agoric.net/',
  children: [
    'activityhash',
    'beansOwing',
    'egress',
    'highPrioritySenders',
    'published',
    'swingStore',
  ],
};

test('vstorage query: Children', async t => {
  const fetchMock = replayIO(web2);
  const rpcClient = makeHttpClient(scenario2.endpoint, fetchMock);

  const tmClient = await Tendermint34Client.create(rpcClient);
  const qClient = new QueryClient(tmClient);
  const rpc = createProtobufRpcClient(qClient);
  const queryService = new QueryClientImpl(rpc);

  const children = await queryService.Children({ path: '' });
  t.deepEqual(children, {
    children: scenario2.children,
    pagination: undefined,
  });
});

// Fixtures for the tests above were captured via integration testing like...
test.skip('vstorage query: Data (capture IO)', async t => {
  const { context: io } = t;
  const { fetch: fetchMock, web } = captureIO(io.fetch);
  const rpcClient = makeHttpClient(scenario2.endpoint, fetchMock);

  const tmClient = await Tendermint34Client.create(rpcClient);
  const qClient = new QueryClient(tmClient);
  const rpc = createProtobufRpcClient(qClient);
  const queryService = new QueryClientImpl(rpc);

  const data = await queryService.Data({ path: '' });
  t.deepEqual(data, { value: '' });

  t.snapshot(web);
});
