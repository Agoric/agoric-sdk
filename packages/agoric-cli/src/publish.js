// @ts-check
/// <reference types="ses"/>

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
 * @returns {ERef<unknown>}
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

const { details: X, quote: q } = assert;

// eslint-disable-next-line jsdoc/require-returns-check
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
  assert(
    Number.isInteger(port),
    X`Expected integer "port" on "http" type connectionSpec, ${connectionSpec}`,
  );
};

// eslint-disable-next-line jsdoc/require-returns-check
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

  const { chainID = 'agoric', homeDirectory } = connectionSpec;

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
};

/**
 * @param {object} powers
 * @param {JsonHttpCall} powers.jsonHttpCall
 * @param {(hostPort: string) => ERef<string>} powers.getAccessToken
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
    assert(response, X`Expected non-null response body, got ${response}`);
    const { ok } = response;
    if (!ok) {
      const { rej } = response;
      assert.typeof(
        rej,
        'string',
        X`Expected "rej" property on JSON response body with "ok": false, got ${response}`,
      );
      throw new Error(
        `Cannot publish bundle, HTTP 200 OK, JSON well-formed, but error message from service: ${rej}`,
      );
    }
  };

  return publishBundleHttp;
};

/**
 * @param {object} args
 * @param {ReturnType<import('./helpers.js').makePspawn>} args.pspawn
 * @param {string} args.cosmosHelper
 * @param {typeof import('path').resolve} args.pathResolve
 * @param {typeof import('fs').promises.writeFile} args.writeFile
 * @param {typeof import('tmp').dirSync} args.tmpDirSync
 */
export const makeCosmosBundlePublisher = ({
  pspawn,
  cosmosHelper,
  pathResolve,
  writeFile,
  tmpDirSync,
}) => {
  /**
   * @param {unknown} bundle
   * @param {CosmosConnectionSpec} connectionSpec
   */
  const publishBundleCosmos = async (bundle, connectionSpec) => {
    const { chainID = 'agoric', homeDirectory } = connectionSpec;

    const { name: tempDirPath, removeCallback } = tmpDirSync({
      unsafeCleanup: true,
      prefix: 'agoric-cli-bundle-',
    });
    try {
      const tempFilePath = pathResolve(tempDirPath, 'bundle.json');
      await writeFile(tempFilePath, `${JSON.stringify(bundle)}\n`);
      const args = [
        'tx',
        'swingset',
        'install-bundle',
        '--gas',
        'auto',
        '--gas-adjustment',
        '1.2',
        '--home',
        homeDirectory,
        '--keyring-backend',
        'test',
        '--from',
        'ag-solo',
        '--chain-id',
        chainID,
        '--yes',
        `@${tempFilePath}`,
      ];
      await pspawn(cosmosHelper, args);
    } finally {
      removeCallback();
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
 * @returns {ERef<void>}
 */

/**
 * @typedef {object} CosmosConnectionSpec
 * @property {'chain-cosmos-sdk' | 'fake-chain'} type
 * @property {string} chainID
 * @property {string} homeDirectory
 */

/**
 * @typedef {HttpConnectionSpec | CosmosConnectionSpec} ConnectionSpec
 */

/**
 * @callback PublishBundleCosmos
 * @param {SourceBundle} bundle
 * @param {CosmosConnectionSpec} connectionSpec
 * @returns {ERef<void>}
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
 * @param {() => ConnectionSpec} [powers.getDefaultConnection]
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
  assert(
    hashBundle !== undefined,
    X`Unrecognized bundle format ${q(
      moduleFormat,
    )}, publishBundle supports only "endoZipBase64" with "endoZipBase64Sha512"`,
  );

  if (connectionSpec === undefined && getDefaultConnection !== undefined) {
    connectionSpec = await getDefaultConnection();
  }

  assert.typeof(
    connectionSpec,
    'object',
    X`Expected object for connectionSpec, got ${connectionSpec}`,
  );
  assert(connectionSpec, X`Expected non-null connectionSpec`);
  const { type } = connectionSpec;
  assert.typeof(type, 'string', X`Expected string "type" on connectionSpec`);

  if (type === 'http') {
    assertHttpConnectionSpec(connectionSpec);
    assert(
      publishBundleHttp,
      'HTTP installation transaction publisher required',
    );
    await publishBundleHttp(bundle, connectionSpec);
  } else if (type === 'chain-cosmos-sdk') {
    assertCosmosConnectionSpec(connectionSpec);
    assert(
      publishBundleCosmos,
      'Cosmos SDK installation transaction publisher required',
    );
    await publishBundleCosmos(bundle, connectionSpec);
  } else if (type === 'fake-chain') {
    // For the purposes of submitting a bundle to an API like
    // E(zoe).install(bundle), in the cases where the publication target does
    // not have an out-of-band mechanism for publishing, it is sufficient to
    // return the original bundle as the bundle.
    // This will remain true except for targets that no longer accept
    // source bundles in-band.
    return bundle;
  } else {
    throw new Error(`Unsupported connection type ${type}`);
  }

  return hashBundle;
};

/**
 * @param {object} powers
 * @param {JsonHttpCall} [powers.jsonHttpCall]
 * @param {(hostPort: string) => ERef<string>} [powers.getAccessToken]
 * @param {PublishBundleCosmos} [powers.publishBundleCosmos]
 * @param {PublishBundleHttp} [powers.publishBundleHttp]
 * @param {() => ConnectionSpec} [powers.getDefaultConnection]
 */
export const makeBundlePublisher = powers => {
  /**
   * @param {SourceBundle} bundle
   * @param {ConnectionSpec} [connectionSpec]
   */
  return async (bundle, connectionSpec) =>
    publishBundle(bundle, connectionSpec, powers);
};
