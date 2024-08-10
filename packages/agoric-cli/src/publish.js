// @ts-check
/// <reference types="ses" />

import { X, q, Fail } from '@endo/errors';
import { E } from '@endo/far';

import {
  iterateEach,
  makeFollower,
  makeLeaderFromRpcAddresses,
  makeCastingSpec,
} from '@agoric/casting';
import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { stringToPath } from '@cosmjs/crypto';
import { Decimal } from '@cosmjs/math';
import { fromBech32 } from '@cosmjs/encoding';
import { MsgInstallBundle } from '@agoric/cosmic-proto/swingset/msgs.js';

// https://github.com/Agoric/agoric-sdk/blob/master/golang/cosmos/daemon/main.go
const Agoric = {
  Bech32MainPrefix: 'agoric',
  CoinType: 564,
  proto: {
    swingset: {
      InstallBundle: {
        // matches package agoric.swingset in swingset/msgs.go
        typeUrl: '/agoric.swingset.MsgInstallBundle',
      },
    },
  },
  // arbitrary fee for installing a bundle
  fee: { amount: [], gas: '50000000' },
  // Agoric chain does not use cosmos gas (yet?)
  gasPrice: { denom: 'uist', amount: Decimal.fromUserInput('50000000', 0) },
};

const hdPath = (coinType = 118, account = 0) =>
  stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

// @ts-expect-error difference in private property _push
const registry = new Registry([
  ...defaultRegistryTypes,
  [Agoric.proto.swingset.InstallBundle.typeUrl, MsgInstallBundle],
]);

/**
 * @typedef {object} JsonHttpRequest
 * @property {string} hostname
 * @property {number} port
 * @property {string} path
 */

/**
 * @callback JsonHttpCall
 * @param {JsonHttpRequest} request
 * @param {unknown} requestBody
 * @returns {Promise<unknown>}
 */

/**
 * @typedef {object} EndoZipBase64Bundle
 * @property {'endoZipBase64'} moduleFormat
 * @property {string} endoZipBase64
 * @property {string} endoZipBase64Sha512
 */

/**
 * @typedef {object} EndoZipBase64Sha512Bundle
 * @property {'endoZipBase64Sha512'} moduleFormat
 * @property {string} endoZipBase64Sha512
 */

/**
 * @typedef {EndoZipBase64Bundle} SourceBundle
 */

/**
 * @typedef {EndoZipBase64Sha512Bundle} HashBundle
 */

/**
 * @typedef {SourceBundle | HashBundle} Bundle
 */

/**
 * @template T
 * @param {Array<T>} array
 * @param {number} randomNumber
 * @returns {T}
 */
const choose = (array, randomNumber) => {
  assert(array.length > 0);
  const index = Math.floor(array.length * randomNumber);
  return array[index];
};

/**
 * @param {unknown} connectionSpec
 * @returns {asserts connectionSpec is HttpConnectionSpec}
 */
const assertHttpConnectionSpec = connectionSpec => {
  assert.typeof(
    connectionSpec,
    'object',
    'Connection details must be an object',
  );
  assert(connectionSpec !== null, 'Connection details must not be null');

  const { host, port } = connectionSpec;
  assert.typeof(
    host,
    'string',
    X`Expected "host" string on "http" type connectionSpec, ${connectionSpec}`,
  );
  assert.typeof(
    port,
    'number',
    X`Expected "port" number on "http" type connectionSpec, ${connectionSpec}`,
  );
  Number.isInteger(port) ||
    Fail`Expected integer "port" on "http" type connectionSpec, ${connectionSpec}`;
};

/**
 * @param {unknown} connectionSpec
 * @returns {asserts connectionSpec is CosmosConnectionSpec}
 */
const assertCosmosConnectionSpec = connectionSpec => {
  assert.typeof(
    connectionSpec,
    'object',
    'Connection details must be an object',
  );
  assert(connectionSpec !== null, 'Connection details must not be null');

  const { chainID = 'agoric', homeDirectory, rpcAddresses } = connectionSpec;

  assert.typeof(
    chainID,
    'string',
    `connection chainID must be a string, got ${chainID}`,
  );

  assert.typeof(
    chainID,
    'string',
    `connection chainID must be a string, got ${chainID}`,
  );
  assert.typeof(
    homeDirectory,
    'string',
    `connection homeDirectory must be a string, got ${homeDirectory}`,
  );

  assert(
    Array.isArray(rpcAddresses),
    `connection rpcAddresses must be an array, got ${rpcAddresses}`,
  );
  assert(
    rpcAddresses.length > 0,
    `connection rpcAddresseses must not be empty`,
  );
  for (const rpcAddress of rpcAddresses) {
    assert.typeof(
      rpcAddress,
      'string',
      `every connection rpcAddress must be a string, got one ${rpcAddress}`,
    );
  }
};

/**
 * @param {object} powers
 * @param {JsonHttpCall} powers.jsonHttpCall
 * @param {(hostPort: string) => Promise<string>} powers.getAccessToken
 */
export const makeHttpBundlePublisher = ({ jsonHttpCall, getAccessToken }) => {
  /** @type {PublishBundleHttp} */
  const publishBundleHttp = async (bundle, { host, port }) => {
    const accessToken = await getAccessToken(`${host}:${port}`);

    const response = await jsonHttpCall(
      {
        hostname: host,
        port,
        path: `/publish-bundle?accessToken=${encodeURIComponent(accessToken)}`,
      },
      bundle,
    );
    assert.typeof(
      response,
      'object',
      X`Expected JSON object response body, got ${response}`,
    );
    if (!response) {
      throw Fail`Expected non-null response body, got ${response}`;
    }
    const { ok } = response;
    if (!ok) {
      const { rej } = response;
      assert.typeof(
        rej,
        'string',
        X`Expected "rej" property on JSON response body with "ok": false, got ${response}`,
      );
      throw Error(
        `Cannot publish bundle, HTTP 200 OK, JSON well-formed, but error message from service: ${rej}`,
      );
    }
  };

  return publishBundleHttp;
};

/**
 * @param {string} address - a domain name, IPv4 address, or URL
 */
const urlForRpcAddress = address => {
  if (address.includes('://')) {
    return address;
  } else {
    return `http://${address}`;
  }
};

/**
 * @param {object} args
 * @param {typeof import('path').resolve} args.pathResolve
 * @param {typeof import('fs').promises.readFile} args.readFile
 * @param {typeof import('@cosmjs/stargate').SigningStargateClient.connectWithSigner} args.connectWithSigner
 * @param {() => number} args.random - a random number in the interval [0, 1)
 */
export const makeCosmosBundlePublisher = ({
  pathResolve,
  readFile,
  connectWithSigner,
  random,
}) => {
  /**
   * @param {unknown} bundle
   * @param {CosmosConnectionSpec} connectionSpec
   */
  const publishBundleCosmos = async (bundle, connectionSpec) => {
    const { homeDirectory, rpcAddresses } = connectionSpec;

    assert.typeof(bundle, 'object', 'Bundles must be objects');
    assert(bundle !== null, 'Bundles must be objects');
    const { endoZipBase64Sha512: expectedEndoZipBase64Sha512 } = bundle;

    const leader = makeLeaderFromRpcAddresses(rpcAddresses);

    const file = await readFile(
      pathResolve(homeDirectory, 'ag-solo-mnemonic'),
      'ascii',
    );
    // AWAIT
    const mnemonic = file.trim();

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: Agoric.Bech32MainPrefix,
      hdPaths: [hdPath(Agoric.CoinType, 0), hdPath(Agoric.CoinType, 1)],
    });

    const [from] = await wallet.getAccounts();

    const installBundleMsg = {
      bundle: JSON.stringify(bundle),
      submitter: fromBech32(from.address).data,
    };

    /** @type {Array<import('@cosmjs/proto-signing').EncodeObject>} */
    const encodeObjects = [
      {
        typeUrl: Agoric.proto.swingset.InstallBundle.typeUrl,
        value: installBundleMsg,
      },
    ];

    let height;
    for (let attempt = 0; ; attempt += 1) {
      const rpcAddress = choose(rpcAddresses, random());

      // TODO round-robin rpcAddress, create client proxy that rotates through clients
      // or push round-robin down to a Tendermint34Client concern (where it ought to be)
      const endpoint = urlForRpcAddress(rpcAddress);

      // AWAIT
      const stargateClient = await connectWithSigner(endpoint, wallet, {
        gasPrice: Agoric.gasPrice,
        registry,
      });

      // AWAIT
      const result = await stargateClient
        .signAndBroadcast(from.address, encodeObjects, Agoric.fee)
        .catch(error => {
          console.error(error);
          return null;
        });
      if (result !== null) {
        let code;
        ({ code, height } = result);
        if (code === 0) {
          break;
        }
      }

      // AWAIT
      await E(leader).jitter('agoric CLI deploy');
    }

    const castingSpec = makeCastingSpec(':bundles');
    const follower = makeFollower(castingSpec, leader);

    for await (const envelope of iterateEach(follower, { height })) {
      const { value } = envelope;
      const { endoZipBase64Sha512, installed, error } = value;
      if (endoZipBase64Sha512 === expectedEndoZipBase64Sha512) {
        if (!installed) {
          throw error;
        } else {
          return;
        }
      }
    }
  };

  return publishBundleCosmos;
};

/**
 * @typedef HttpConnectionSpec
 * @property {'http'} type
 * @property {string} host
 * @property {number} port
 */

/**
 * @callback PublishBundleHttp
 * @param {SourceBundle} bundle
 * @param {HttpConnectionSpec} connectionSpec
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} CosmosConnectionSpec
 * @property {'chain-cosmos-sdk' | 'fake-chain'} type
 * @property {string} chainID
 * @property {string} homeDirectory
 * @property {Array<string>} rpcAddresses
 */

/**
 * @typedef {HttpConnectionSpec | CosmosConnectionSpec} ConnectionSpec
 */

/**
 * @callback PublishBundleCosmos
 * @param {SourceBundle} bundle
 * @param {CosmosConnectionSpec} connectionSpec
 * @returns {Promise<void>}
 */

/**
 * @typedef {ReturnType<typeof makeBundlePublisher>} PublishBundle
 */

/**
 * @param {SourceBundle} bundle
 * @param {ConnectionSpec | undefined} connectionSpec
 * @param {object} powers
 * @param {PublishBundleCosmos} [powers.publishBundleCosmos]
 * @param {PublishBundleHttp} [powers.publishBundleHttp]
 * @param {() => Promise<ConnectionSpec>} [powers.getDefaultConnection]
 * @returns {Promise<Bundle>}
 */
const publishBundle = async (
  bundle,
  connectionSpec,
  { publishBundleCosmos, publishBundleHttp, getDefaultConnection },
) => {
  // We attempt to construct a hash bundle for the given bundle first, to
  // ensure that we can before attempting to publish.
  // The publisher will not necessarily be able to do this for us, so we cannot
  // depend on the server to convert the bundle to its corresponding hash
  // bundle.
  // For example, publishing to a chain is a one-way operation that gets queued
  // to be processed possibly long after the server responds, and does not
  // guarantee success.
  // A hash bundle is the bundle format that a method like
  // E(zoe).install(hashBundle) must accept after the actual bundle has been
  // published.

  /** @type {Bundle | undefined} */
  let hashBundle;
  assert.typeof(bundle, 'object', `Bundle must be object, got ${bundle}`);
  assert(bundle !== null, `Bundle must not be null, got ${bundle}`);
  const { moduleFormat } = bundle;
  assert.typeof(
    moduleFormat,
    'string',
    X`Expected string "moduleFormat" on bundle`,
  );
  if (moduleFormat === 'endoZipBase64') {
    const { endoZipBase64Sha512 } = bundle;
    assert.typeof(
      endoZipBase64Sha512,
      'string',
      X`Expected string "endoZipBase64Sha512" on bundle`,
    );
    hashBundle = harden({
      moduleFormat: 'endoZipBase64Sha512',
      endoZipBase64Sha512,
    });
  }
  if (hashBundle === undefined) {
    throw Fail`Unrecognized bundle format ${q(
      moduleFormat,
    )}, publishBundle supports only "endoZipBase64" with "endoZipBase64Sha512"`;
  }

  await null;
  if (connectionSpec === undefined && getDefaultConnection !== undefined) {
    connectionSpec = await getDefaultConnection();
  }

  assert.typeof(
    connectionSpec,
    'object',
    X`Expected object for connectionSpec, got ${connectionSpec}`,
  );
  connectionSpec || Fail`Expected non-null connectionSpec`;
  const { type } = connectionSpec;
  assert.typeof(type, 'string', X`Expected string "type" on connectionSpec`);

  let p;
  if (type === 'http') {
    assertHttpConnectionSpec(connectionSpec);
    assert(
      publishBundleHttp,
      'HTTP installation transaction publisher required',
    );
    p = publishBundleHttp(bundle, connectionSpec);
  } else if (type === 'chain-cosmos-sdk') {
    assertCosmosConnectionSpec(connectionSpec);
    assert(
      publishBundleCosmos,
      'Cosmos SDK installation transaction publisher required',
    );
    p = publishBundleCosmos(bundle, connectionSpec);
  } else if (type === 'fake-chain') {
    // For the purposes of submitting a bundle to an API like
    // E(zoe).install(bundle), in the cases where the publication target does
    // not have an out-of-band mechanism for publishing, it is sufficient to
    // return the original bundle as the bundle.
    // This will remain true except for targets that no longer accept
    // source bundles in-band.
    return bundle;
  } else {
    throw Error(`Unsupported connection type ${type}`);
  }

  await p;
  return hashBundle;
};

/**
 * @param {object} powers
 * @param {JsonHttpCall} [powers.jsonHttpCall]
 * @param {(hostPort: string) => Promise<string>} [powers.getAccessToken]
 * @param {PublishBundleCosmos} [powers.publishBundleCosmos]
 * @param {PublishBundleHttp} [powers.publishBundleHttp]
 * @param {() => Promise<ConnectionSpec>} [powers.getDefaultConnection]
 */
export const makeBundlePublisher = powers => {
  /**
   * @param {SourceBundle} bundle
   * @param {ConnectionSpec} [connectionSpec]
   */
  return async (bundle, connectionSpec) =>
    publishBundle(bundle, connectionSpec, powers);
};
