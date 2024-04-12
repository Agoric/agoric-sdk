// @ts-check
/* global globalThis */
import anyTest from 'ava';
import {
  createProtobufRpcClient,
  QueryClient,
  setupBankExtension,
} from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import {
  QueryChildrenRequest,
  QueryChildrenResponse,
} from '@agoric/cosmic-proto/vstorage/query.js';

import { makeHttpClient } from '../src/makeHttpClient.js';
import { captureIO, replayIO, web1, web2 } from './net-access-fixture.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = /** @type {any} */ (anyTest);

const RECORDING = false;

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

// XXX open code until https://github.com/Agoric/agoric-sdk/issues/9200
class QueryClientImpl {
  rpc;

  service;

  constructor(rpc, opts) {
    this.service = opts?.service || 'agoric.vstorage.Query';
    this.rpc = rpc;
  }

  Children(request) {
    const reqData = QueryChildrenRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, 'Children', reqData);
    return promise.then(respData => QueryChildrenResponse.decode(respData));
  }
}

test(`vstorage query: Children (RECORDING: ${RECORDING})`, async t => {
  const { context: io } = t;

  const { fetch: fetchMock, web } = io.recording
    ? captureIO(io.fetch)
    : { fetch: replayIO(web2), web: new Map() };
  const rpcClient = makeHttpClient(scenario2.endpoint, fetchMock);

  const tmClient = await Tendermint34Client.create(rpcClient);
  const qClient = new QueryClient(tmClient);
  const rpc = createProtobufRpcClient(qClient);
  const queryService = new QueryClientImpl(rpc);

  const children = await queryService.Children({ path: '' });
  if (io.recording) {
    t.snapshot(web);
  }
  t.deepEqual(children, {
    children: scenario2.children,
    pagination: undefined,
  });
});
