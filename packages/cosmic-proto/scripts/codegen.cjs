#!/usr/bin/env node
// @ts-check

/* eslint-env node */
const { execSync, spawnSync } = require('child_process');
const fsp = require('fs/promises');
const path = require('path');
const assert = require('node:assert/strict');
const process = require('process');
const { TelescopeBuilder } = require('@hyperweb/telescope');
const rimraf = require('rimraf').rimrafSync;

const protoDirs = [path.join(__dirname, '/../proto')];
const outPath = path.join(__dirname, '../src/codegen');
rimraf(outPath);

/**
 * Make the JsonSafe type import compatible with TS verbatimImportSyntax
 *
 * @param {string} directory
 * @param {boolean} gnuSed
 */
function fixTypeImport(directory, gnuSed) {
  const fullPath = path.resolve(directory);
  const quotedPath = JSON.stringify(fullPath);
  const command = `
    find ${quotedPath} -type f -exec ${gnuSed ? 'sed -i' : 'sed -i ""'} \
    -e 's/import { JsonSafe/import {type JsonSafe/g' \
    -e 's/\\([{,]\\) \\([[:alnum:]_]*SDKType\\)/\\1 type \\2/g' {} +
  `;

  execSync(command, { stdio: 'inherit' });
}

/**
 * Remove SigningClientParams from generated types helper to avoid bringing in
 * CosmJS signer endpoint typing surface in this package.
 *
 * @param {string} filePath
 */
async function removeSigningClientParams(filePath) {
  const source = await fsp.readFile(filePath, 'utf8');
  let next = source;

  next = next.replace(
    /^import\s+\{\s*OfflineSigner\s*\}\s+from\s+'@cosmjs\/proto-signing';\n/m,
    '',
  );
  next = next.replace(
    /^import\s+\{\s*HttpEndpoint\s*\}\s+from\s+'@cosmjs\/tendermint-rpc';\n/m,
    '',
  );
  next = next.replace(
    /\nexport interface SigningClientParams \{[\s\S]*?\n\}\n?/m,
    '\n',
  );

  if (next !== source) {
    await fsp.writeFile(filePath, next);
  }
}

/**
 * @type {import('@hyperweb/telescope').TelescopeInput}
 */
const input = {
  protoDirs,
  outPath,
  options: {
    useInterchainJs: false,
    // for ESM compatibility
    restoreImportExtension: '.js',
    tsDisable: {
      // FIXME types aren't resolving correctly
      disableAll: true,
      files: [
        'cosmos/authz/v1beta1/tx.amino.ts',
        'cosmos/staking/v1beta1/tx.amino.ts',
      ],
      patterns: ['**/*amino.ts', '**/*registry.ts'],
    },
    interfaces: {
      enabled: true,
      // useGlobalDecoderRegistry: true,
      registerAllDecodersToGlobal: false,
      useUnionTypes: false,
    },
    prototypes: {
      /**
       * Not working as expected with @hyperweb/telescope
       * It was only implemented for an Amino registry.
       */
      // enableRegistryLoader: true,
      /**
       * Relies on tree-shaking to avoid huge bundle sizes.
       */
      enableMessageComposer: false,
      includePackageVar: false,
      excluded: {
        packages: [
          'ibc.applications.fee.v1', // issue with parsing protos (LCD routes with nested objects in params)

          'cosmos.app.v1alpha1',
          'cosmos.app.v1beta1',
          'cosmos.base.kv.v1beta1',
          'cosmos.base.reflection.v1beta1',
          'cosmos.base.snapshots.v1beta1',
          'cosmos.base.store.v1beta1',
          'cosmos.base.tendermint.v1beta1',
          'cosmos.crisis.v1beta1',
          'cosmos.evidence.v1beta1',
          'cosmos.genutil.v1beta1',

          'cosmos.autocli.v1',

          'cosmos.msg.v1',
          'cosmos.nft.v1beta1',
          'cosmos.capability.v1beta1',
          'cosmos.orm.v1alpha1',
          'cosmos.orm.v1',
          'cosmos.slashing.v1beta1',
          'google.api',
          'ibc.core.port.v1',
          'ibc.core.types.v1',
        ],
      },
      methods: {
        fromJSON: true,
        toJSON: true,
        encode: true,
        decode: true,
        fromPartial: true,
        toAmino: false,
        fromAmino: false,
        fromProto: true,
        toProto: true,
      },
      parser: {
        keepCase: false,
      },
      typingsFormat: {
        useDeepPartial: false,
        timestamp: /** @type {const} */ ('timestamp'),

        // [Defaults]
        // timestamp: 'date',
        // duration: 'duration',
        // num64: 'bigint',
        // useExact: false,
        // customTypes: {
        //   useCosmosSDKDec: true,
        // },
        customTypes: {
          base64Lib: /** @type {const} */ ('@endo/base64'),
          useEnhancedDecimal: true,
        },
      },
    },
    aminoEncoding: {
      // Must be enabled for getSigningAgoricClient
      enabled: false,
      // disableMsgTypes: true,
    },
    lcdClients: {
      enabled: false,
    },
    // We don't use these helper functions
    helperFunctions: {
      enabled: false,
    },
    rpcClients: {
      enabled: false,
    },
  },
};

const builder = new TelescopeBuilder(input);

const strcmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const createTypeFromUrl = async () => {
  const { store } = builder;
  const fileExports = {};
  for (const proto of store.getProtos()) {
    // console.log(proto);
    if (!proto.traversed) {
      continue;
    }
    const typeUrlPrefix = `/${proto.proto.package}.`;
    const parsedExports = proto.traversed?.parsedExports;
    if (!parsedExports) {
      continue;
    }
    const exports = Object.keys(parsedExports).sort(strcmp);
    if (!exports.length) {
      continue;
    }

    const importFrom = `./${proto.filename.replace(/\.proto$/, '.js')}`;
    fileExports[importFrom] = exports.map(exp => [
      `${typeUrlPrefix}${exp}`,
      exp,
    ]);
  }

  const sortedEntries = Object.entries(fileExports).sort(([a], [b]) =>
    strcmp(a, b),
  );

  const props = [];
  const imports = {};
  for (const [importFrom, exports] of sortedEntries) {
    const imp = importFrom.replaceAll(/[\/\.]/g, str => {
      switch (str) {
        case '/':
          return '$';
        case '.':
          return '_';
        default:
          assert.fail(`unrecognized string ${str}`);
      }
    });
    imports[imp] = importFrom;
    for (const [typeUrl, exp] of exports) {
      props.push(`  ${JSON.stringify(typeUrl)}: ${imp}.${exp};`);
    }
  }

  // Render the output.
  const out = [];
  out.push(
    `\
// DO NOT EDIT; generated by ${path.relative(process.cwd(), __filename)}
    `,
  );
  for (const [imp, importFrom] of Object.entries(imports)) {
    out.push(`import type * as ${imp} from ${JSON.stringify(importFrom)};`);
  }
  out.push('', `export type TypeFromUrl = {`, ...props, `};`, '');
  return out.join('\n');
};

builder
  .build()
  .then(async () => {
    const typeFromUrlContents = await createTypeFromUrl();
    // CAVEAT: This file needs to be a `.ts` instead of `.d.ts` or else `tsc`
    // won't compile its types into the dist output.
    const typeFromUrlFile = path.join(outPath, 'typeFromUrl.ts');
    await fsp.writeFile(typeFromUrlFile, typeFromUrlContents);

    console.log('🔨 code generated by Telescope');

    // for all files under codegen/ replace "import { JsonSafe" with "import type { JsonSafe"
    const gnuSed =
      execSync(`sed --help 2>&1 | sed 2q | grep -qe '-i ' || printf gnu`, {
        encoding: 'utf8',
      }) === 'gnu';
    fixTypeImport('./src/codegen', gnuSed);
    console.log('🔧 type keyword added');

    const repoRoot = path.join(__dirname, '..', '..', '..');
    const srcFromRoot = path.relative(
      repoRoot,
      path.join(__dirname, '..', 'src'),
    );
    const codegenFromRoot = path.join(srcFromRoot, 'codegen');
    const prettierResult = spawnSync(
      'yarn',
      ['run', '-T', 'prettier', '--write', codegenFromRoot],
      {
        cwd: repoRoot,
        stdio: 'inherit',
      },
    );
    if (prettierResult.error) {
      throw prettierResult.error;
    }
    assert.equal(prettierResult.status, 0);
    console.log('💅 code formatted by Prettier');

    const typesHelperFile = path.join(outPath, 'types.ts');
    await removeSigningClientParams(typesHelperFile);
    const prettierTypesResult = spawnSync(
      'yarn',
      ['run', '--top-level', 'prettier', '--write', 'src/codegen/types.ts'],
      {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      },
    );
    assert.equal(prettierTypesResult.status, 0);
    console.log('🧹 removed SigningClientParams from generated types helper');

    console.log('ℹ️ `yarn build && yarn test` to test it.');
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
