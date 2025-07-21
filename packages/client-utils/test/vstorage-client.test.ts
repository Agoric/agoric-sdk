import test from 'ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  INVALID_RPC_ADDRESS_ERROR_MESSAGE,
  makeVStorageClient,
  PATH_PREFIX,
  PATHS,
} from '@agoric/client-utils/src/vstorage-client.js';
import { QueryChildrenResponse } from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { encodeBase64 } from '@endo/base64';

type AbciResponse = {
  code: number;
  ok: boolean;
  value:
    | string
    | {
        blockHeight: string;
        values: Array<string>;
      };
  text?: string;
};

type Response = {
  abciResponse: AbciResponse;
  height: bigint;
  kind: (typeof PATHS)[keyof typeof PATHS];
  path: string;
};

const encodings = Array.from({ length: 256 }, (_, b) =>
  b.toString(16).padStart(2, '0'),
);
const RPC_ADDRESS = 'http://localhost:26657';

const testConfig = {
  chainName: 'test-chain',
  rpcAddrs: [RPC_ADDRESS],
};

const createResponseMap = (responses: Array<Response>) =>
  responses.reduce<Record<string, AbciResponse>>(
    (map, { abciResponse, height, kind, path }) => ({
      ...map,
      [encodeURI(
        `${RPC_ADDRESS}/abci_query?data=0x${encodeHex(path)}&height=${height}&path="${PATH_PREFIX}/${kind}"`,
      )]: abciResponse,
    }),
    {},
  );

const encodeHex = (str: string) =>
  Array.from(`\n\t${str}`, b => encodings[b.charCodeAt(0)]).join('');

const makeMockFetch = (responses: Record<string, AbciResponse>) =>
  (async (url: string) => {
    const response = responses[url];
    return {
      json: () => Promise.resolve({ result: { response } }),
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
