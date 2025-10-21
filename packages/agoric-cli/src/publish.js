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

import { makePspawn, getSDKBinaries } from './helpers.js';

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
  if (homeDirectory !== undefined) {
    assert.typeof(
      homeDirectory,
      'string',
      `connection homeDirectory must be a string if present, got ${homeDirectory}`,
    );
  }

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
 * @param {object} powers
 * @param {typeof import('path').resolve} powers.pathResolve
 * @param {typeof import('fs').promises.writeFile} powers.writeFile
 * @param {typeof import('tmp').dirSync} powers.tmpDirSync
 * @param {() => number} powers.random - a random number in the interval [0, 1)
 * @param {typeof import('child_process').spawn} powers.spawn
 */
export const makeCosmosBundlePublisher = ({
  pathResolve,
  writeFile,
  random,
  spawn,
  tmpDirSync,
}) => {
  const publishBundleAgd = async (bundle, connectionSpec, transactionSpec) => {
    await null;

    const { useSdk = false } = transactionSpec ?? {};

    const sdkPrefixes = {};
    if (!useSdk) {
      const agoricPrefix = pathResolve(`node_modules/@agoric`);
      sdkPrefixes.goPfx = agoricPrefix;
      sdkPrefixes.jsPfx = agoricPrefix;
    }

    const pspawnEnv = { ...process.env, DEBUG: 'agoric,deploy,deploy:publish' };
    const pspawn = makePspawn({ env: pspawnEnv, spawn, log: console });

    const { cosmosHelper } = getSDKBinaries(sdkPrefixes);

    /**
     * @param {unknown} bundle
     * @param {CosmosConnectionSpec} connectionSpec
     * @param {TransactionSpec} [transactionSpec]
     */
    assert.typeof(bundle, 'object', 'Bundles must be objects');
    assert(bundle !== null, 'Bundles must be objects');
    const { endoZipBase64Sha512: expectedEndoZipBase64Sha512 } = bundle;

    const {
      chainID = 'agoriclocal',
      homeDirectory,
      rpcAddresses,
    } = connectionSpec;

    const { name: tempDirPath, removeCallback: removeTemporaryBundle } =
      tmpDirSync({
        unsafeCleanup: true,
        prefix: 'agoric-cli-bundle-',
      });

    const leader = makeLeaderFromRpcAddresses(rpcAddresses);
    let height;

    try {
      const tempFilePath = pathResolve(tempDirPath, 'bundle.json');
      await writeFile(tempFilePath, `${JSON.stringify(bundle)}\n`);

      for (let attempt = 0; ; attempt += 1) {
        const rpcAddress = choose(rpcAddresses, random());

        const {
          gas = 'auto',
          gasAdjustment = '1.2',
          gasPrices = undefined,
          home = homeDirectory
            ? pathResolve(homeDirectory, 'ag-cosmos-helper-statedir')
            : undefined,
          node = urlForRpcAddress(rpcAddress),
          keyringBackend = 'test',
          keyringDirectory = undefined,
          from: fromLabel = 'ag-solo',
          interactive = false,
          ledger = false,
          feeGranter = undefined,
          feePayer = undefined,
          fees = undefined,
          note = undefined,
          signMode = undefined,
          timeoutHeight = undefined,
          logFormat = undefined,
          logNoColor = false,
          trace = false,
        } = transactionSpec ?? {};

        const args = [
          'tx',
          'swingset',
          'install-bundle',
          '--compress',
          ...['--gas', gas],
          ...['--gas-adjustment', gasAdjustment],
          ...(feeGranter !== undefined? ['--fee-granter', feeGranter] : []),
          ...(feePayer !== undefined? ['--fee-payer', feePayer] : []),
          ...(fees!== undefined ? ['--fees', fees] : []),
          ...(gasPrices !== undefined? ['--gas-prices', gasPrices] : []),
          ...(home !== undefined? ['--home', home] : []),
          ...(ledger ? ['--ledger'] : []),
          ...(note !== undefined ? ['--note', note] : []),
          ...(signMode !== undefined ? ['--sign-mode', signMode] : []),
          ...['--node', node],
          ...['--keyring-backend', keyringBackend],
          ...(keyringDirectory !== undefined ? ['--keyring-dir', keyringDirectory] : []),
          ...['--from', fromLabel],
          ...['--chain-id', chainID],
          // The CLI help claims that the modes are sync|async.
          // The mode "block" works, and is presumed equivalent to sync.
          ...['--broadcast-mode', 'sync'],
          ...['--output', 'json'],
          ...(interactive ? [] : ['--yes']),
          ...(timeoutHeight !== undefined ? ['--timeout-height', timeoutHeight] : []),
          // Cosmos CLI went with snake_case for log flags and no governing
          // principle is in evidence.
          ...(logFormat !== undefined ? ['--log_format', logFormat] : []),
          ...(logNoColor ? ['--log_no_color'] : []),
          ...(trace ? ['--trace'] : []),
          `@${tempFilePath}`,
        ];
        const promise = pspawn(cosmosHelper, args, {
          stdio: ['inherit', 'pipe', 'inherit'],
        });
        const { childProcess } = promise;
        const { stdout } = childProcess;
        assert(stdout);
        const buffer = new ArrayBuffer(1024, { maxByteLength: 0x1_00_00_00_00});
        const bytes = new Uint8Array(buffer);
        let byteLength = 0;
        stdout.on('data', chunk => {
          while (byteLength + chunk.byteLength >= buffer.byteLength) {
            buffer.resize(buffer.byteLength * 2);
          }
          bytes.set(chunk, byteLength);
          byteLength += chunk.byteLength;
        });
        const exitCode = await promise;
        if (exitCode === 0) {
          const text = new TextDecoder().decode(bytes.subarray(0, byteLength));
          const json = JSON.parse(text);
          const { code } = json;
          if (code === 0) {
            const { height: heightString } = json;
            height = parseInt(heightString, 10);
            break;
          }
          console.error(json);
        }

        // AWAIT
        await E(leader).jitter('agoric CLI deploy');
      }
    } finally {
      removeTemporaryBundle();
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

  return publishBundleAgd;
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
 * @param {TransactionSpec | undefined} transactionSpec
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} CosmosConnectionSpec
 * @property {'chain-cosmos-sdk' | 'fake-chain'} type
 * @property {string} chainID
 * @property {string} homeDirectory
 * @property {Array<string>} rpcAddresses
 */

/** @typedef {'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'panic'} AgdLoggingLevel */
/** @typedef {'direct' | 'amino-json' | 'direct-aux'} AgdSignMode */

/**
 * @typedef {object} TransactionSpec
 * @property {string | undefined} feeGranter
 * @property {string | undefined} feePayer
 * @property {string | undefined} fees
 * @property {string | undefined} from
 * @property {string | undefined} gas
 * @property {string | undefined} gasAdjustment
 * @property {string | undefined} gasPrices
 * @property {string | undefined} home
 * @property {string | undefined} keyringBackend
 * @property {string | undefined} keyringDirectory
 * @property {boolean} ledger
 * @property {'json' | 'plain'} logFormat
 * @property {boolean} logNoColor
 * @property {AgdLoggingLevel} loggingLevel
 * @property {string | undefined} node
 * @property {string | undefined} note
 * @property {AgdSignMode} signMode
 * @property {string | undefined} timeoutHeight
 * @property {string | undefined} tip
 * @property {string | undefined} trace
 * @property {boolean} useSdk
 */

/**
 * @typedef {HttpConnectionSpec | CosmosConnectionSpec} ConnectionSpec
 */

/**
 * @callback PublishBundleCosmos
 * @param {SourceBundle} bundle
 * @param {CosmosConnectionSpec} connectionSpec
 * @param {TransactionSpec | undefined} transactionSpec
 * @returns {Promise<void>}
 */

/**
 * @typedef {ReturnType<typeof makeBundlePublisher>} PublishBundle
 */

/**
 * @param {SourceBundle} bundle
 * @param {ConnectionSpec | undefined} connectionSpec
 * @param {TransactionSpec | undefined} transactionSpec
 * @param {object} powers
 * @param {PublishBundleCosmos} [powers.publishBundleCosmos]
 * @param {PublishBundleHttp} [powers.publishBundleHttp]
 * @param {() => Promise<ConnectionSpec>} [powers.getDefaultConnection]
 * @returns {Promise<Bundle>}
 */
const publishBundle = async (
  bundle,
  connectionSpec,
  transactionSpec,
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
    p = publishBundleHttp(bundle, connectionSpec, transactionSpec);
  } else if (type === 'chain-cosmos-sdk') {
    assertCosmosConnectionSpec(connectionSpec);
    assert(
      publishBundleCosmos,
      'Cosmos SDK installation transaction publisher required',
    );
    p = publishBundleCosmos(bundle, connectionSpec, transactionSpec);
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
   * @param {TransactionSpec} [transactionSpec]
   */
  return async (bundle, connectionSpec, transactionSpec) =>
    publishBundle(bundle, connectionSpec, transactionSpec, powers);
};
