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

import { Fail, q } from '@endo/errors';
import BufferLineTransform from '@agoric/internal/src/node/buffer-line-transform.js';
import { importSwingStore, openSwingStore } from '@agoric/swing-store';

import { isEntrypoint } from './helpers/is-entrypoint.js';
import { makeProcessValue } from './helpers/process-value.js';
import {
  ExportManifestFileName,
  checkExportDataMode,
  checkArtifactMode,
} from './export-kernel-db.js';

/**
 * @typedef {object} StateSyncImporterOptions
 * @property {string} stateDir the directory containing the SwingStore to export
 * @property {string} exportDir the directory where to place the exported artifacts and manifest
 * @property {number} [blockHeight] block height to check for
 * @property {import('./export-kernel-db.js').SwingStoreExportDataMode} [exportDataMode] how to handle export data
 * @property {import('./export-kernel-db.js').SwingStoreArtifactMode} [artifactMode] the level of historical artifacts to import
 */

/**
 * @param {object} options
 * @returns {asserts options is StateSyncImporterOptions}
 */
export const validateImporterOptions = options => {
  typeof options === 'object' || Fail`options is not an object`;
  typeof options.stateDir === 'string' ||
    Fail`required stateDir option not a string`;
  typeof options.exportDir === 'string' ||
    Fail`required exportDir option not a string`;
  options.blockHeight == null ||
    typeof options.blockHeight === 'number' ||
    Fail`optional blockHeight option not a number`;
  checkExportDataMode(options.exportDataMode, true);
  checkArtifactMode(options.artifactMode);
  options.includeHistorical === undefined ||
    Fail`deprecated includeHistorical option found`;
};

/**
 * @param {Pick<StateSyncImporterOptions, 'artifactMode' | 'exportDataMode' >} options
 * @param {Readonly<import('./export-kernel-db.js').StateSyncManifest>} manifest
 * @returns {import('@agoric/swing-store').ImportSwingStoreOptions}
 */
const checkAndGetImportSwingStoreOptions = (options, manifest) => {
  typeof manifest.blockHeight === 'number' ||
    Fail`Cannot restore snapshot without block height`;

  manifest.data || Fail`State-sync manifest missing export data`;

  const { artifactMode = manifest.artifactMode || 'operational' } = options;

  if (artifactMode === 'none') {
    throw Fail`Cannot import "export data" without at least "operational" artifacts`;
  }

  manifest.artifacts?.length ||
    Fail`State-sync manifest missing required artifacts`;

  switch (artifactMode) {
    case 'debug':
    // eslint-disable-next-line no-fallthrough
    case 'operational':
      if (manifest.artifactMode === 'operational') break;
    // eslint-disable-next-line no-fallthrough
    case 'replay':
      if (manifest.artifactMode === 'replay') break;
    // eslint-disable-next-line no-fallthrough
    case 'archival':
      if (manifest.artifactMode === 'archival') break;
      if (
        manifest.artifactMode === undefined ||
        manifest.artifactMode === 'debug'
      ) {
        // assume the export has sufficient data
        break;
      }
      throw Fail`State-sync manifest has insufficient artifacts: requested import artifact mode: ${q(
        artifactMode,
      )}, manifest has ${q(manifest.artifactMode)} artifacts`;
    default:
      throw Fail`Unexpected artifactMode ${q(artifactMode)}`;
  }
  return { artifactMode };
};

/**
 * @param {StateSyncImporterOptions} options
 * @param {object} powers
 * @param {Pick<import('fs/promises'), 'readFile'> & Pick<import('fs'), 'createReadStream'>} powers.fs
 * @param {import('path')['resolve']} powers.pathResolve
 * @param {typeof import('@agoric/swing-store')['importSwingStore']} [powers.importSwingStore]
 * @param {typeof import('@agoric/swing-store')['openSwingStore']} [powers.openSwingStore]
 * @param {null | ((...args: any[]) => void)} [powers.log]
 * @returns {Promise<void>}
 */
export const performStateSyncImport = async (
  { stateDir, exportDir, blockHeight, exportDataMode = 'all', artifactMode },
  {
    fs: { createReadStream, readFile },
    pathResolve,
    importSwingStore: importDB = importSwingStore,
    openSwingStore: openDB = openSwingStore,
    log = console.log,
  },
) => {
  /** @param {string} allegedRelativeFilename */
  const safeExportFileResolve = allegedRelativeFilename => {
    const resolvedPath = pathResolve(exportDir, allegedRelativeFilename);
    resolvedPath.startsWith(exportDir) ||
      Fail`Exported file ${q(
        allegedRelativeFilename,
      )} must be in export dir ${q(exportDir)}`;
    return resolvedPath;
  };

  const manifestPath = safeExportFileResolve(ExportManifestFileName);
  /** @type {Readonly<import('./export-kernel-db.js').StateSyncManifest>} */
  const manifest = await readFile(manifestPath, { encoding: 'utf-8' }).then(
    data => JSON.parse(data),
  );

  if (blockHeight !== undefined && manifest.blockHeight !== blockHeight) {
    Fail`State-sync manifest for unexpected block height ${q(
      manifest.blockHeight,
    )} (expected ${q(blockHeight)})`;
  }

  const artifacts = harden(Object.fromEntries(manifest.artifacts || []));

  // Represent the data in `exportDir` as a SwingSetExporter object.
  /** @type {import('@agoric/swing-store').SwingStoreExporter} */
  const exporter = harden({
    getHostKV(_key) {
      return undefined;
    },
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
        Fail`invalid artifact ${q(name)}`;
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

  if (exportDataMode === 'all') {
    const importOptions = checkAndGetImportSwingStoreOptions(
      { artifactMode, exportDataMode },
      manifest,
    );

    const swingstore = await importDB(exporter, stateDir, importOptions);

    const { hostStorage } = swingstore;

    hostStorage.kvStore.set('host.height', String(manifest.blockHeight));
    await hostStorage.commit();
    await hostStorage.close();
  } else if (exportDataMode === 'repair-metadata') {
    blockHeight !== 0 || Fail`repair metadata requires a block height`;

    manifest.data || Fail`State-sync manifest missing export data`;

    artifactMode === 'none' ||
      Fail`Cannot restore artifacts while repairing metadata`;

    const { hostStorage } = openDB(stateDir);

    const savedBlockHeight =
      Number(hostStorage.kvStore.get('host.height')) || 0;

    if (blockHeight !== savedBlockHeight) {
      throw Fail`block height doesn't match. requested=${q(
        blockHeight,
      )}, current=${q(savedBlockHeight)}`;
    }

    await hostStorage.repairMetadata(exporter);

    await hostStorage.commit();
    await hostStorage.close();
  } else if (exportDataMode === 'skip') {
    throw Fail`Repopulation of artifacts not yet supported`;
  } else {
    throw Fail`Unknown export-data-mode ${exportDataMode}`;
  }
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
    // We try to find the actual cosmos state directory (default=~/.agoric)
    `${processValue.getFlag('home', `${homedir}/.agoric`)}/data/agoric`;

  const stateDirStat = await fs.stat(stateDir);
  if (!stateDirStat.isDirectory()) {
    throw Error('state-dir must be an exiting directory');
  }

  const exportDir = pathResolve(
    /** @type {string} */ (processValue.getFlag('export-dir', '.')),
  );

  const artifactMode =
    /** @type {import('./export-kernel-db.js').SwingStoreArtifactMode | undefined} */ (
      processValue.getFlag('artifact-mode')
    );
  checkArtifactMode(artifactMode);

  const exportDataMode = processValue.getFlag('export-data-mode');
  checkExportDataMode(exportDataMode, true);

  if (
    processValue.getBoolean({ flagName: 'include-historical' }) !== undefined
  ) {
    throw Fail`deprecated "include-historical" options, use "artifact-mode" instead`;
  }

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
      artifactMode,
      exportDataMode,
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
