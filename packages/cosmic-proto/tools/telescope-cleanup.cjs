/* eslint-env node */
const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

/**
 * @param {string} directory
 * @param {boolean} gnuSed
 */
function fixTypeImportForVerbatim(directory, gnuSed) {
  const fullPath = path.resolve(directory);
  const command = `
    find ${fullPath} -type f -exec ${gnuSed ? 'sed -i' : 'sed -i ""'} \
    -e 's/import { JsonSafe/import {type JsonSafe/g' \
    -e 's/\\([{,]\\) \\([[:alnum:]_]*SDKType\\)/\\1 type \\2/g' {} +
  `;
  execSync(command, { stdio: 'inherit' });
}

const detectGnuSed = () =>
  execSync(`sed --help 2>&1 | sed 2q | grep -qe '-i ' || printf gnu`, {
    encoding: 'utf8',
  }) === 'gnu';

/**
 * @param {string} filePath
 * @param {(source: string) => string} rewrite
 */
const rewriteFile = async (filePath, rewrite) => {
  if (!existsSync(filePath)) {
    return false;
  }
  const source = await fsp.readFile(filePath, 'utf8');
  const next = rewrite(source);
  if (next !== source) {
    await fsp.writeFile(filePath, next);
    return true;
  }
  return false;
};

/**
 * @param {string} filePath
 * @param {boolean} includeSigningClientParamsCleanup
 */
async function fixTypesHelper(filePath, includeSigningClientParamsCleanup) {
  return rewriteFile(filePath, source => {
    let next = source;
    next = next.replace(
      /^import\s+\{\s*IBinaryReader,\s*IBinaryWriter\s*\}\s+from\s+['"]\.\/binary\.js['"];\n/m,
      "import type { IBinaryReader, IBinaryWriter } from './binary.js';\n",
    );
    next = next.replace(
      /^import\s+\{\s*OfflineSigner\s*\}\s+from\s+'@cosmjs\/proto-signing';\n/m,
      "import type { OfflineSigner } from '@cosmjs/proto-signing';\n",
    );
    next = next.replace(
      /^import\s+\{\s*HttpEndpoint\s*\}\s+from\s+'@cosmjs\/tendermint-rpc';\n/m,
      "import type { HttpEndpoint } from '@cosmjs/tendermint-rpc';\n",
    );
    next = next.replace(
      /^import\s+\{\s*HttpEndpoint\s*\}\s+from\s+'@interchainjs\/types';\n/m,
      "import type { HttpEndpoint } from '@interchainjs/types';\n",
    );
    next = next.replace(
      /^import\s+\{\s*DeliverTxResponse,\s*Event,\s*Attribute\s*\}\s+from\s+'@interchainjs\/types';\n/m,
      "import type { DeliverTxResponse, Event, Attribute } from '@interchainjs/types';\n",
    );
    if (includeSigningClientParamsCleanup) {
      next = next.replace(
        /\nexport interface SigningClientParams \{[\s\S]*?\n\}\n?/m,
        '\n',
      );
    }
    return next;
  });
}

/**
 * @param {string} filePath
 */
async function fixExternHelper(filePath) {
  return rewriteFile(filePath, source => {
    let next = source;
    next = next.replace(
      /^import\s+\{\s*Rpc\s*\}\s+from\s+['"]\.\/helpers(?:\.js)?['"];\n/m,
      "import type { Rpc } from './helpers.js';\n",
    );
    next = next.replace(
      /^import\s+\{\s*HttpEndpoint\s*\}\s+from\s+['"]@interchainjs\/types['"];\n/m,
      "import type { HttpEndpoint } from '@interchainjs/types';\n",
    );
    next = next.replace(
      /^import\s+\{\s*ClientOptions,\s*createCosmosQueryClient\s*\}\s+from\s+['"]@interchainjs\/cosmos['"];\n/m,
      "import type { ClientOptions } from '@interchainjs/cosmos';\n",
    );
    if (!next.includes('getCreateCosmosQueryClient')) {
      next = next.replace(
        /const _rpcClients: Record<string, Rpc> = \{\};\n/,
        `const _rpcClients: Record<string, Rpc> = {};

let _createCosmosQueryClient;
const getCreateCosmosQueryClient = async () => {
  if (!_createCosmosQueryClient) {
    ({ createCosmosQueryClient: _createCosmosQueryClient } = await import(
      '@interchainjs/cosmos'
    ));
  }
  return _createCosmosQueryClient;
};
`,
      );
    }
    next = next.replaceAll(
      'return createCosmosQueryClient(',
      'const createCosmosQueryClient = await getCreateCosmosQueryClient();\n    return createCosmosQueryClient(',
    );
    return next;
  });
}

/**
 * @param {string} filePath
 */
async function fixRegistryHelper(filePath) {
  return rewriteFile(filePath, source => {
    let next = source;
    next = next.replace(
      /^import\s+\{\s*IProtoType,\s*TelescopeGeneratedCodec\s*\}\s+from\s+['"]\.\/types\.js['"];\n/m,
      "import type { IProtoType, TelescopeGeneratedCodec } from './types.js';\n",
    );
    next = next.replace(
      /^import\s+\{\s*Any,\s*AnyAmino\s*\}\s+from\s+['"]\.\/google\/protobuf\/any\.js['"];\n/m,
      "import { Any } from './google/protobuf/any.js';\nimport type { AnyAmino } from './google/protobuf/any.js';\n",
    );
    return next;
  });
}

/**
 * @param {string} filePath
 */
async function fixHelperFuncTypes(filePath) {
  return rewriteFile(filePath, source => {
    let next = source;
    next = next.replace(
      /^import\s+\{\s*HttpEndpoint\s*\}\s+from\s+['"]@interchainjs\/types['"];\n/m,
      "import type { HttpEndpoint } from '@interchainjs/types';\n",
    );
    next = next.replace(
      /^import\s+\{\s*BinaryReader,\s*BinaryWriter\s*\}\s+from\s+['"]\.\/binary\.js['"];\n/m,
      "import type { BinaryReader, BinaryWriter } from './binary.js';\n",
    );
    next = next.replace(
      /^import\s+\{\s*isRpc,\s*Rpc\s*\}\s+from\s+['"]\.\/helpers\.js['"];\n/m,
      "import { isRpc } from './helpers.js';\nimport type { Rpc } from './helpers.js';\n",
    );
    next = next.replace(
      /import\s+\{\s*TelescopeGeneratedCodec,\s*DeliverTxResponse,\s*Message,\s*StdFee,\s*\}\s+from\s+['"]\.\/types\.js['"];\n/m,
      "import type { TelescopeGeneratedCodec, DeliverTxResponse, Message, StdFee } from './types.js';\n",
    );
    next = next.replace(
      /^import\s+\{\s*ISigningClient\s*\}\s+from\s+['"]@interchainjs\/cosmos['"];\n/m,
      "import type { ISigningClient } from '@interchainjs/cosmos';\n",
    );
    next = next.replace(
      /^import\s+\{\s*toConverters,\s*toEncoders\s*\}\s+from\s+['"]@interchainjs\/cosmos['"];\n/m,
      '',
    );
    if (!next.includes('getInterchainTxHelpers')) {
      next = next.replace(
        /export interface QueryBuilderOptions<TReq, TRes> \{/,
        `let _toConverters;
let _toEncoders;
const getInterchainTxHelpers = async () => {
  if (!_toConverters || !_toEncoders) {
    ({ toConverters: _toConverters, toEncoders: _toEncoders } = await import(
      '@interchainjs/cosmos'
    ));
  }
  return { toConverters: _toConverters, toEncoders: _toEncoders };
};

export interface QueryBuilderOptions<TReq, TRes> {`,
      );
    }
    next = next.replace(
      /\s{4}\/\/\s*register all related encoders and converters\n\s{4}client\.addEncoders\?\.\(toEncoders\(opts\.msg\)\);\n\s{4}client\.addConverters\?\.\(toConverters\(opts\.msg\)\);\n/,
      `    // register all related encoders and converters
    const { toConverters, toEncoders } = await getInterchainTxHelpers();
    client.addEncoders?.(toEncoders(opts.msg));
    client.addConverters?.(toConverters(opts.msg));
`,
    );
    return next;
  });
}

/**
 * @param {string} outPath
 */
async function fixRpcTypeImports(outPath) {
  /** @type {string[]} */
  const changed = [];

  /**
   * @param {string} dirPath
   */
  const walk = async dirPath => {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (
        !entry.isFile() ||
        !entry.name.endsWith('.ts') ||
        !/(\.rpc\.|^rpc\.)/.test(entry.name)
      ) {
        continue;
      }
      const didChange = await rewriteFile(entryPath, source => {
        let next = source;
        if (entry.name === 'query.rpc.Query.ts') {
          next = next.replace(
            /^import\s+\{\s*TxRpc\s*\}\s+from\s+(['"])([^'"]+)\/types\.js\1;\n/m,
            "import type { Rpc } from '$2/helpers.js';\n",
          );
          next = next.replace(/\bTxRpc\b/g, 'Rpc');
        } else {
          next = next.replace(
            /^import\s+\{\s*TxRpc\s*\}\s+from\s+(['"].*\/types\.js['"]);\n/m,
            'import type { TxRpc } from $1;\n',
          );
        }
        next = next.replace(
          /^import\s+\{\s*Rpc\s*\}\s+from\s+(['"].*\/helpers\.js['"]);\n/m,
          'import type { Rpc } from $1;\n',
        );
        if (entry.name.endsWith('.rpc.func.ts')) {
          next = next.replace(/^[ \t]*\*[ \t]+rpc[^\n]*returns[^\n]*\n/gm, '');
        }
        next = next.replace(
          /^import\s+\{\s*Tendermint34Client,\s*HttpEndpoint\s*\}\s+from\s+['"]@cosmjs\/tendermint-rpc['"];\n/m,
          "import { Tendermint34Client } from '@cosmjs/tendermint-rpc';\nimport type { HttpEndpoint } from '@cosmjs/tendermint-rpc';\n",
        );
        return next;
      });
      if (didChange) {
        changed.push(entryPath);
      }
    }
  };

  await walk(outPath);
  return changed;
}

/**
 * Apply shared Telescope output fixes.
 *
 * @param {{
 *   outPath: string,
 *   includeSigningClientParamsCleanup?: boolean,
 *   includeHelperCleanups?: boolean
 * }} params
 */
async function applyTelescopeFixes({
  outPath,
  includeSigningClientParamsCleanup = false,
  includeHelperCleanups = true,
}) {
  const targets = includeHelperCleanups
    ? [
        {
          filePath: path.join(outPath, 'types.ts'),
          fix: fp => fixTypesHelper(fp, includeSigningClientParamsCleanup),
        },
        {
          filePath: path.join(outPath, 'extern.ts'),
          fix: fixExternHelper,
        },
        {
          filePath: path.join(outPath, 'registry.ts'),
          fix: fixRegistryHelper,
        },
        {
          filePath: path.join(outPath, 'helper-func-types.ts'),
          fix: fixHelperFuncTypes,
        },
      ]
    : [];

  /** @type {string[]} */
  const changed = [];
  const targetResults = await Promise.all(
    targets.map(target => target.fix(target.filePath)),
  );
  for (const [index, didChange] of targetResults.entries()) {
    if (didChange) {
      changed.push(targets[index].filePath);
    }
  }

  const rpcChanged = await fixRpcTypeImports(outPath);
  changed.push(...rpcChanged);

  return changed;
}

module.exports = {
  applyTelescopeFixes,
  fixRpcTypeImports,
  detectGnuSed,
  fixTypeImportForVerbatim,
};
