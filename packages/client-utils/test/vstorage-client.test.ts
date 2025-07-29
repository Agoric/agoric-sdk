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
  height: bigint;
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
    (map, { abciResponse: { ok, text, ...rest }, height, kind, path }) => ({
      ...map,
      [encodeURI(
        `${RPC_ADDRESS}/abci_query?data=0x${encodeHex(path)}&height=${height}&path="${PATH_PREFIX}/${kind}"`,
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
    { message: new RegExp(`.*${INVALID_RPC_ADDRESS_ERROR_MESSAGE}.*`) },
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
      height: 0n,
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
  const height = 3n;
  const invalidHeight = height * -1n;
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
      height: height - 1n,
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
      height: height - 2n,
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
              blockHeight: String(height - 2n),
              values: [],
            }),
          }).finish(),
        ),
      },
      height: 0n,
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

  let data = await topic.latest(height);
  t.deepEqual(JSON.parse(data), expectedData);

  await t.throwsAsync(() => topic.latest(invalidHeight), {
    message: new RegExp(`.*${INVALID_HEIGHT_ERROR_MESSAGE} ${invalidHeight}.*`),
  });

  data = await topic.latest(height - 1n);
  t.deepEqual(JSON.parse(data), lowestHeightExpectedData);

  await t.throwsAsync(() => topic.latest());
});

test('should receive the expected stream data', async t => {
  const height = 3n;
  const path = 'published';
  const streamCell = {
    blockHeight: String(height),
    values: [JSON.stringify('value1'), JSON.stringify('value2')],
  };

  const nonStreamValue = 'some plain data';
  const oldValue = 'old value';

  const mockResponses = {
    ...createResponseMap([
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
        height: 0n,
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
        height,
        kind: PATHS.DATA,
        path,
      },
      {
        abciResponse: {
          code: 0,
          ok: true,
          value: encodeBase64(
            QueryDataResponse.encode({
              value: oldValue,
            }).finish(),
          ),
        },
        height: height - 1n,
        kind: PATHS.DATA,
        path,
      },
      {
        abciResponse: {
          code: 0,
          ok: true,
          value: encodeBase64(
            QueryDataResponse.encode({
              value: nonStreamValue,
            }).finish(),
          ),
        },
        height: height - 2n,
        kind: PATHS.DATA,
        path,
      },
    ]),
    [`${RPC_ADDRESS}/status`]: {
      sync_info: {
        catching_up: false,
        latest_block_height: String(height),
      },
      ok: true,
    },
  };

  const vStorageClient = makeVStorageClient(
    { fetch: makeMockFetch(mockResponses) },
    testConfig,
  );

  const streamTopic = vStorageClient.fromText<StreamCell>(path);
  const latestCell = await streamTopic.latest(height);
  t.deepEqual(latestCell, streamCell);

  const reverseResults: Array<Update<StreamCell>> = [];
  for await (const value of streamTopic.reverseIterate(height, height))
    reverseResults.push(value);

  t.deepEqual(
    reverseResults.map(u => u.value),
    streamCell.values.map(value => JSON.parse(value)).reverse(),
  );

  const forwardResults: Array<Update<StreamCell>> = [];
  for await (const value of streamTopic.iterate()) forwardResults.push(value);

  t.deepEqual(
    forwardResults.map(u => u.value),
    [
      nonStreamValue,
      oldValue,
      ...streamCell.values.map(value => JSON.parse(value)),
    ],
  );

  const compatTopic = vStorageClient.fromText<StreamCell>(path, {
    compat: true,
  });
  const compatReverseResults: Array<Update<StreamCell>> = [];
  for await (const value of compatTopic.reverseIterate())
    compatReverseResults.push(value);

  t.deepEqual(
    compatReverseResults.map(u => u.value),
    [
      ...streamCell.values.map(value => JSON.parse(value)).reverse(),
      oldValue,
      nonStreamValue,
    ],
  );
});
