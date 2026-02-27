import test from 'ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  INVALID_HEIGHT_ERROR_MESSAGE,
  INVALID_RPC_ADDRESS_ERROR_MESSAGE,
  makeVStorageClient,
  PATH_PREFIX,
  PATHS,
} from '@agoric/client-utils/src/vstorage-client.js';
import {
  QueryChildrenResponse,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { encodeBase64 } from '@endo/base64';

type AbciResponse = {
  code: number;
  ok: boolean;
  value: string | StreamCell;
  text?: string;
};

type Response = {
  abciResponse: AbciResponse;
  blockHeight: bigint;
  kind: (typeof PATHS)[keyof typeof PATHS];
  path: string;
};

type StreamCell =
  import('@agoric/client-utils/src/vstorage-client.js').StreamCell;

type Update<T> =
  import('@agoric/client-utils/src/vstorage-client.js').Update<T>;

const encodings = Array.from({ length: 256 }, (_, b) =>
  b.toString(16).padStart(2, '0'),
);
const RPC_ADDRESS = 'http://localhost:26657';

const testConfig = {
  chainName: 'test-chain',
  rpcAddrs: [RPC_ADDRESS],
};

const createResponseMap = (responses: Array<Response>) =>
  responses.reduce<
    Record<
      string,
      {
        ok: AbciResponse['ok'];
        response?: {
          code: AbciResponse['code'];
          value: AbciResponse['value'];
        };
        sync_info?: {
          catching_up: boolean;
          latest_block_height: string;
        };
        text?: AbciResponse['text'];
      }
    >
  >(
    (
      map,
      { abciResponse: { ok, text, ...rest }, blockHeight, kind, path },
    ) => ({
      ...map,
      [encodeURI(
        `${RPC_ADDRESS}/abci_query?data=0x${encodeHex(path)}&height=${blockHeight}&path="${PATH_PREFIX}/${kind}"`,
      )]: { ok, response: rest, text },
    }),
    {},
  );

const encodeHex = (str: string) =>
  Array.from(`\n\t${str}`, b => encodings[b.charCodeAt(0)]).join('');

const makeMockFetch = (responses: ReturnType<typeof createResponseMap>) =>
  (async (url: string) => {
    const response = responses[url];
    return {
      json: () => Promise.resolve({ result: response }),
      ok: !response ? false : response.ok,
      text: () =>
        Promise.resolve(
          !response
            ? 'url not found in registered responses'
            : response.text || '',
        ),
    };
  }) as Window['fetch'];

test('should throw error on no rpc address', t => {
  t.throws(
    () =>
      makeVStorageClient(
        { fetch: (...args) => makeMockFetch({})(...args) },
        {
          chainName: testConfig.chainName,
          rpcAddrs: [],
        },
      ),
    { message: errMsg => errMsg.includes(INVALID_RPC_ADDRESS_ERROR_MESSAGE) },
  );
});

test('should receive the expected keys', async t => {
  const expectedKeys = ['governance'];
  let mockFetch: Window['fetch'];
  const path = 'published';

  const responses: Array<Response> = [
    {
      abciResponse: {
        code: 0,
        ok: true,
        value: encodeBase64(
          QueryChildrenResponse.encode({ children: expectedKeys }).finish(),
        ),
      },
      blockHeight: 0n,
      kind: PATHS.CHILDREN,
      path,
    },
  ];

  const vStorageClient = makeVStorageClient(
    { fetch: (...args) => mockFetch(...args) },
    testConfig,
  );

  mockFetch = makeMockFetch(createResponseMap(responses));

  const keys = await vStorageClient.keys(path);
  t.deepEqual(keys, expectedKeys);
});

test('should receive the expected topic data', async t => {
  const expectedData = {
    hookAccount: {
      chainId: 'agoric-3',
      encoding: 'bech32',
      value:
        'agoric1m6shs4jk2yxga82rkzr3vt6fhzfs0nqkkw5d8uwq2z50h6j25n9s6xzruc',
    },
  };
  const lowestHeightExpectedData = {
    ...expectedData,
    hookAccount: {
      ...expectedData.hookAccount,
      value: 'agoric150kwm3g7v9n9m78525ca2h5nzvu9uzkp7qddw9',
    },
  };
  const blockHeight = 3n;
  const invalidHeight = blockHeight * -1n;
  let mockFetch: Window['fetch'];
  const path = 'published';

  const responses: Array<Response> = [
    {
      abciResponse: {
        code: 0,
        ok: true,
        value: encodeBase64(
          QueryDataResponse.encode({
            value: JSON.stringify(expectedData),
          }).finish(),
        ),
      },
      blockHeight: blockHeight - 1n,
      kind: PATHS.DATA,
      path,
    },
    {
      abciResponse: {
        code: 0,
        ok: true,
        value: encodeBase64(
          QueryDataResponse.encode({
            value: JSON.stringify(lowestHeightExpectedData),
          }).finish(),
        ),
      },
      blockHeight: blockHeight - 2n,
      kind: PATHS.DATA,
      path,
    },
    {
      abciResponse: {
        code: 0,
        ok: true,
        value: encodeBase64(
          QueryDataResponse.encode({
            value: JSON.stringify({
              blockHeight: String(blockHeight - 2n),
              values: [],
            }),
          }).finish(),
        ),
      },
      blockHeight: 0n,
      kind: PATHS.DATA,
      path,
    },
  ];

  const vStorageClient = makeVStorageClient(
    { fetch: (...args) => mockFetch(...args) },
    testConfig,
  );

  mockFetch = makeMockFetch(createResponseMap(responses));

  const topic = vStorageClient.fromTextBlock(path);

  let data = await topic.latest(blockHeight);
  t.is(data.blockHeight, blockHeight);
  t.deepEqual(JSON.parse(data.value), expectedData);

  await t.throwsAsync(() => topic.latest(invalidHeight), {
    message: errMsg => errMsg.includes(INVALID_HEIGHT_ERROR_MESSAGE),
  });

  data = await topic.latest(blockHeight - 1n);
  t.is(data.blockHeight, blockHeight - 1n);
  t.deepEqual(JSON.parse(data.value), lowestHeightExpectedData);

  await t.throwsAsync(() => topic.latest());
});

test('should receive the expected stream data', async t => {
  const blockHeight = 2n;
  const path = 'published';
  const latestStreamCell = {
    blockHeight: String(blockHeight),
    values: [JSON.stringify('value3'), JSON.stringify('value4')],
  };
  const streamCell = {
    blockHeight: String(blockHeight - 1n),
    values: [JSON.stringify('value1'), JSON.stringify('value2')],
  };

  const mockResponses = {
    ...createResponseMap([
      {
        abciResponse: {
          code: 0,
          ok: true,
          value: encodeBase64(
            QueryDataResponse.encode({
              value: JSON.stringify(latestStreamCell),
            }).finish(),
          ),
        },
        blockHeight: 0n,
        kind: PATHS.DATA,
        path,
      },
      {
        abciResponse: {
          code: 0,
          ok: true,
          value: encodeBase64(
            QueryDataResponse.encode({
              value: JSON.stringify(latestStreamCell),
            }).finish(),
          ),
        },
        blockHeight,
        kind: PATHS.DATA,
        path,
      },
      {
        abciResponse: {
          code: 0,
          ok: true,
          value: encodeBase64(
            QueryDataResponse.encode({
              value: JSON.stringify(streamCell),
            }).finish(),
          ),
        },
        blockHeight: blockHeight - 1n,
        kind: PATHS.DATA,
        path,
      },
    ]),
  };

  const vStorageClient = makeVStorageClient(
    { fetch: makeMockFetch(mockResponses) },
    testConfig,
  );

  const streamTopic = vStorageClient.fromText<string>(path);
  const latestCell = await streamTopic.latest(blockHeight);

  t.is(latestCell.blockHeight, BigInt(latestStreamCell.blockHeight));
  t.is(
    latestCell.value,
    String([...latestStreamCell.values].reverse().find(Boolean)),
  );

  const reverseResults: Array<Update<string>> = [];
  for await (const value of streamTopic.reverseIterate())
    reverseResults.push(value);

  t.deepEqual(
    reverseResults.map(u => u.value),
    [
      ...[...latestStreamCell.values].reverse(),
      ...[...streamCell.values].reverse(),
    ],
  );

  const forwardResults: Array<Update<string>> = [];
  for await (const value of streamTopic.iterate()) forwardResults.push(value);

  t.deepEqual(
    forwardResults.map(u => u.value),
    [...streamCell.values, ...latestStreamCell.values],
  );
});
