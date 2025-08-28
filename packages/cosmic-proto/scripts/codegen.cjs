#!/usr/bin/env node
// @ts-check

/* eslint-env node */
const { exec, execSync, spawnSync } = require('child_process');
const fsp = require('fs/promises');
const path = require('path');
const assert = require('node:assert/strict');
const process = require('process');
const { TelescopeBuilder } = require('@cosmology/telescope');
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
  const command = `
    find ${fullPath} -type f -exec ${gnuSed ? 'sed -i' : 'sed -i ""'} \
    -e 's/import { JsonSafe/import {type JsonSafe/g' \
    -e 's/\\([{,]\\) \\([[:alnum:]_]*SDKType\\)/\\1 type \\2/g' {} +
  `;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during replacement: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Standard error: ${stderr}`);
    }
  });
}

const input = {
  protoDirs,
  outPath,
  options: {
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
      useUnionTypes: false,
    },
    prototypes: {
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
      // Necessary for getSigningAgoricClient
      enabled: false,
    },
    lcdClients: {
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

    // top-level to get the root prettier config
    const prettierResult = spawnSync(
      'yarn',
      ['run', '--top-level', 'prettier', '--write', 'src'],
      {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      },
    );
    assert.equal(prettierResult.status, 0);
    console.log('💅 code formatted by Prettier');

    console.log('ℹ️ `yarn build && yarn test` to test it.');
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
