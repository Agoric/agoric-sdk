#! /usr/bin/env node
// @ts-check
// @jessie-check

import '@endo/init/unsafe-fast.js';

import os from 'os';
import process from 'process';
import { Transform } from 'stream';
import fsPower from 'fs';
import fsPromisesPower from 'fs/promises';
import pathPower from 'path';

import BufferLineTransform from '@agoric/internal/src/node/buffer-line-transform.js';
import { Fail } from '@agoric/assert';
import { importSwingStore } from '@agoric/swing-store';

import { isEntrypoint } from './helpers/is-entrypoint.js';
import { makeProcessValue } from './helpers/process-value.js';
import { ExportManifestFileName } from './export-kernel-db.js';

/**
 * @typedef {object} StateSyncImporterOptions
 * @property {string} stateDir the directory containing the SwingStore to export
 * @property {string} exportDir the directory where to place the exported artifacts and manifest
 * @property {number} [blockHeight] block height to check for
 * @property {boolean} [includeHistorical] whether to include historical artifacts in the export
 */

/**
 * @param {StateSyncImporterOptions} options
 * @param {object} powers
 * @param {Pick<import('fs/promises'), 'readFile'> & Pick<import('fs'), 'createReadStream'>} powers.fs
 * @param {import('path')['resolve']} powers.pathResolve
 * @param {typeof import('@agoric/swing-store')['importSwingStore']} [powers.importSwingStore]
 * @param {null | ((...args: any[]) => void)} [powers.log]
 * @returns {Promise<void>}
 */
export const performStateSyncImport = async (
  { stateDir, exportDir, blockHeight, includeHistorical },
  {
    fs: { createReadStream, readFile },
    pathResolve,
    importSwingStore: importDB = importSwingStore,
    log = console.log,
  },
) => {
  /** @param {string} allegedRelativeFilename */
  const safeExportFileResolve = allegedRelativeFilename => {
    const resolvedPath = pathResolve(exportDir, allegedRelativeFilename);
    resolvedPath.startsWith(exportDir) ||
      Fail`Exported file ${allegedRelativeFilename} must be in export dir ${exportDir}`;
    return resolvedPath;
  };

  const manifestPath = safeExportFileResolve(ExportManifestFileName);
  /** @type {Readonly<import('./export-kernel-db.js').StateSyncManifest>} */
  const manifest = await readFile(manifestPath, { encoding: 'utf-8' }).then(
    data => JSON.parse(data),
  );

  if (blockHeight !== undefined && manifest.blockHeight !== blockHeight) {
    Fail`State-sync manifest for unexpected block height ${manifest.blockHeight} (expected ${blockHeight})`;
  }

  if (!manifest.data) {
    throw Fail`State-sync manifest missing export data`;
  }

  if (!manifest.artifacts) {
    throw Fail`State-sync manifest missing required artifacts`;
  }

  const artifacts = harden(Object.fromEntries(manifest.artifacts));

  if (
    includeHistorical &&
    manifest.mode !== 'archival' &&
    manifest.mode !== 'debug'
  ) {
    throw Fail`State-sync manifest missing historical artifacts`;
  }

  // Represent the data in `exportDir` as a SwingSetExporter object.
  /** @type {import('@agoric/swing-store').SwingStoreExporter} */
  const exporter = harden({
    async *getExportData() {
      log?.('importing export data');
      const exportData = createReadStream(
        safeExportFileResolve(/** @type {string} */ (manifest.data)),
      );
      const exportDataEntries = exportData
        .pipe(new BufferLineTransform())
        .setEncoding('utf8')
        .pipe(
          new Transform({
            objectMode: true,
            transform(data, encoding, callback) {
              try {
                callback(null, JSON.parse(data));
              } catch (error) {
                callback(error);
              }
            },
          }),
        );
      yield* exportDataEntries;
    },
    async *getArtifact(name) {
      log?.(`importing artifact ${name}`);
      const fileName = artifacts[name];
      if (!fileName) {
        Fail`invalid artifact ${name}`;
      }
      const stream = createReadStream(safeExportFileResolve(fileName));
      yield* stream;
    },
    async *getArtifactNames() {
      yield* Object.keys(artifacts);
    },
    async close() {
      // TODO
    },
  });

  const swingstore = await importDB(exporter, stateDir, { includeHistorical });

  const { hostStorage } = swingstore;

  hostStorage.kvStore.set('host.height', String(manifest.blockHeight));
  await hostStorage.commit();
  await hostStorage.close();
};

/**
 * @param {string[]} args
 * @param {object} powers
 * @param {Partial<Record<string, string>>} powers.env
 * @param {string} powers.homedir
 * @param {Console} powers.console
 * @param {Pick<import('fs/promises'), 'readFile' | 'stat'> & Pick<import('fs'), 'createReadStream'>} powers.fs
 * @param {import('path')['resolve']} powers.pathResolve
 */
export const main = async (
  args,
  { env, homedir, console, fs, pathResolve },
) => {
  const processValue = makeProcessValue({ env, args });

  const stateDir =
    processValue.getFlag('state-dir') ||
    // We try to find the actual cosmos state directory (default=~/.ag-chain-cosmos)
    `${processValue.getFlag(
      'home',
      `${homedir}/.ag-chain-cosmos`,
    )}/data/agoric`;

  const stateDirStat = await fs.stat(stateDir);
  if (!stateDirStat.isDirectory()) {
    throw Error('state-dir must be an exiting directory');
  }

  const exportDir = pathResolve(
    /** @type {string} */ (processValue.getFlag('export-dir', '.')),
  );

  const includeHistorical = processValue.getBoolean({
    flagName: 'include-historical',
  });

  const checkBlockHeight = processValue.getInteger({
    flagName: 'check-block-height',
  });

  const verbose = processValue.getBoolean({
    flagName: 'verbose',
  });

  await performStateSyncImport(
    {
      stateDir,
      exportDir,
      blockHeight: checkBlockHeight,
      includeHistorical,
    },
    {
      fs,
      pathResolve,
      log: verbose ? console.log : undefined,
    },
  );
};

if (isEntrypoint(import.meta.url)) {
  main(process.argv.splice(2), {
    homedir: os.homedir(),
    env: process.env,
    console,
    fs: { ...fsPower, ...fsPromisesPower },
    pathResolve: pathPower.resolve,
  }).then(
    _res => 0,
    rej => {
      console.error(`error running export-kernel-db:`, rej);
      process.exit(process.exitCode || rej.exitCode || 1);
    },
  );
}
