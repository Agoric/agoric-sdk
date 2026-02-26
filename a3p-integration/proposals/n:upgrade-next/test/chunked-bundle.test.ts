import '@endo/init/debug.js';
import test from 'ava';

import { fromHex } from '@cosmjs/encoding';
import {
  DirectSecp256k1Wallet,
  type EncodeObject,
} from '@cosmjs/proto-signing';
import {
  assertIsDeliverTxSuccess,
  GasPrice,
  SigningStargateClient,
} from '@cosmjs/stargate';
import bundleSource from '@endo/bundle-source';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip as gzipCb } from 'node:zlib';

import {
  installBundle,
  LOCAL_CONFIG,
  makeAgoricQueryClient,
  makeBundleRegistry,
} from '@agoric/client-utils';
import type { BinaryLike } from 'crypto';

const gzip = promisify(gzipCb);

// From agoric-3-proposals synthetic-chain run_prepare_zero.sh
const GOV1_PRIVATE_KEY = fromHex(
  '57ecd5ca73bb97c71ae2c356346b4b615d4e52fb34081fe656e5f6942ca8e56d',
);
const GOV1_ADDRESS = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

const sha512 = async (bytes: BinaryLike) =>
  createHash('sha512').update(bytes).digest();

const defaultChunkLimit = 512 * 1024;
const chunkLimitMultiple = 8;

const getChunkSizeLimit = async () => {
  const queryClient = await makeAgoricQueryClient(LOCAL_CONFIG);
  const { params } = await queryClient.agoric.swingset.params({});
  const rawLimit = Number(params?.chunkSizeLimitBytes || 0);
  const chainLimit = rawLimit > 0 ? rawLimit : defaultChunkLimit;
  // Force chunking while staying under the chain's limit.

  return Math.min(chainLimit, 4 * 1024);
};

const makeLargeBundleJson = async (chunkSizeLimit: number) => {
  const workDir = await mkdtemp(path.join(tmpdir(), 'chunked-bundle-'));
  const entry = path.join(workDir, 'bundle-entry.js');
  const array = new Uint8Array(chunkSizeLimit * chunkLimitMultiple);
  // Fill with random data to prevent compression from defeating chunking.
  crypto.getRandomValues(array);
  const largeLiteral: string = Array.from(array)
    .map(byte => String.fromCharCode('a'.charCodeAt(0) + (byte % 26)))
    .join('');
  await writeFile(
    path.join(workDir, 'package.json'),
    JSON.stringify(
      {
        name: 'chunked-bundle-test',
        version: '1.0.0',
        type: 'module',
      },
      null,
      2,
    ),
    'utf-8',
  );
  await writeFile(
    entry,
    `export const payload = '${largeLiteral}'; export default () => payload;\n`,
    'utf-8',
  );
  const bundle = await bundleSource(entry, { elideComments: true });
  return JSON.stringify(bundle);
};

test('chunked bundle publishing via MsgSendChunk', async t => {
  const chunkSizeLimit = await getChunkSizeLimit();
  const bundleJson = await makeLargeBundleJson(chunkSizeLimit);
  t.true(
    bundleJson.length > chunkSizeLimit,
    'bundle should exceed chunk limit to force chunking',
  );

  const wallet = await DirectSecp256k1Wallet.fromKey(
    GOV1_PRIVATE_KEY,
    'agoric',
  );
  const [{ address }] = await wallet.getAccounts();
  assert.equal(address, GOV1_ADDRESS);
  const rpcEndpoint = LOCAL_CONFIG.rpcAddrs[0];
  const client = await SigningStargateClient.connectWithSigner(
    rpcEndpoint,
    wallet,
    {
      // arbitrarily chosen gas price for test
      gasPrice: GasPrice.fromString('0.012ubld'),
      // @ts-expect-error differing private types
      registry: makeBundleRegistry(),
    },
  );

  const signAndBroadcast = async (msg: EncodeObject) => {
    const result = await client.signAndBroadcast(address, [msg], 'auto');
    assertIsDeliverTxSuccess(result);
    return result;
  };

  const result = await installBundle({
    bundleJson,
    chunkSizeLimit,
    submitter: address,
    gzip: async bytes => new Uint8Array(await gzip(bytes)),
    sha512,
    signAndBroadcast,
  });

  t.true(result.chunked, 'expected chunked install path');
  t.true((result.chunkCount || 0) > 1, 'expected multiple chunks');
  t.truthy(result.chunkedArtifactId, 'expected chunked artifact id');
});
