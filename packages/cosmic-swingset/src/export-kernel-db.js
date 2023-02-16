#! /usr/bin/env node

// @ts-check
import '@endo/init';

import os from 'os';
import process from 'process';
import fsPower from 'fs/promises';
import pathPower from 'path';

import { makePromiseKit } from '@endo/promise-kit';
import { Fail } from '@agoric/assert';
import { makeAggregateError } from '@agoric/internal';
import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';
import { openSwingStore, makeSwingStoreExporter } from '@agoric/swing-store';

import { isEntrypoint } from './helpers/is-entrypoint.js';
import { makeProcessValue } from './helpers/process-value.js';

/** @typedef {'current' | 'archival' | 'debug'} SwingStoreExportMode */

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * @param {string | undefined} mode
 * @returns {asserts mode is SwingStoreExportMode | undefined}
 */
const checkExportMode = mode => {
  switch (mode) {
    case 'current':
    case 'archival':
    case 'debug':
    case undefined:
      break;
    default:
      throw Fail`Invalid value ${mode} for "export-mode"`;
  }
};

/**
 * A state-sync manifest is a representation of the information contained in a
 * swingStore export for a given block.
 *
 * The `data` field is the name of a file containing the swingStore's KV
 *   "export data".
 * The `artifacts` field is a list of [artifactName, fileName] pairs
 *   (where the content of each artifact is stored in the corresponding file).
 * For more details, see packages/swing-store/docs/data-export.md
 *
 * @typedef {object} StateSyncManifest
 * @property {number} blockHeight the block height corresponding to this export
 * @property {SwingStoreExportMode} [mode]
 * @property {string} [data] file name containing the swingStore "export data"
 * @property {Array<[artifactName: string, fileName: string]>} artifacts
 *   List of swingStore export artifacts which can be validated by the export data
 */

/**
 * @typedef {object} StateSyncExporter
 * @property {() => number | undefined} getBlockHeight
 * @property {() => Promise<void>} onStarted
 * @property {() => Promise<void>} onDone
 * @property {() => Promise<void>} stop
 */

/**
 * @typedef {object} StateSyncExporterOptions
 * @property {string} stateDir the directory containing the SwingStore to export
 * @property {string} exportDir the directory in which to place the exported artifacts and manifest
 * @property {number} [blockHeight] block height to check for
 * @property {SwingStoreExportMode} [exportMode] whether to include historical or debug artifacts in the export
 * @property {boolean} [includeExportData] whether to include an artifact for the export data in the export
 */

/**
 * @param {StateSyncExporterOptions} options
 * @param {object} powers
 * @param {Pick<import('fs/promises'), 'open' | 'writeFile'>} powers.fs
 * @param {import('path')['resolve']} powers.pathResolve
 * @param {typeof import('@agoric/swing-store')['makeSwingStoreExporter']} [powers.makeSwingStoreExporter]
 * @param {typeof import('@agoric/swing-store')['openSwingStore']} [powers.openSwingStore]
 * @param {(...args: any[]) => void} [powers.log]
 * @returns {StateSyncExporter}
 */
export const initiateSwingStoreExport = (
  { stateDir, exportDir, blockHeight, exportMode, includeExportData },
  {
    fs: { open, writeFile },
    pathResolve,
    makeSwingStoreExporter: makeExporter = makeSwingStoreExporter,
    openSwingStore: openDB = openSwingStore,
    log = console.log,
  },
) => {
  const effectiveExportMode = exportMode ?? 'current';
  if (effectiveExportMode !== 'current' && !includeExportData) {
    throw Fail`Must include export data if export mode not "current"`;
  }

  /** @type {number | undefined} */
  let savedBlockHeight;

  /** @type {import('@endo/promise-kit').PromiseKit<void>} */
  const startedKit = makePromiseKit();

  /** @type {Error | undefined} */
  let stopped;
  const abortIfStopped = () => {
    if (stopped) throw stopped;
  };
  /** @type {Array<() => Promise<void>>} */
  const cleanup = [];

  const exportDone = (async () => {
    const manifestPath = pathResolve(exportDir, 'export-manifest.json');
    const manifestFile = await open(manifestPath, 'wx');
    cleanup.push(async () => manifestFile.close());

    const swingStoreExporter = makeExporter(stateDir, exportMode);
    cleanup.push(async () => swingStoreExporter.close());

    const { hostStorage } = openDB(stateDir);

    savedBlockHeight = Number(hostStorage.kvStore.get('host.height')) || 0;
    await hostStorage.close();

    if (blockHeight) {
      blockHeight === savedBlockHeight ||
        Fail`DB at unexpected block height ${savedBlockHeight} (expected ${blockHeight})`;
    }

    abortIfStopped();
    startedKit.resolve();
    log?.(`Starting DB export at block height ${savedBlockHeight}`);

    /** @type {StateSyncManifest} */
    const manifest = {
      blockHeight: savedBlockHeight,
      mode: exportMode,
      artifacts: [],
    };

    if (includeExportData) {
      log?.(`Writing Export Data`);
      const fileName = `export-data.jsonl`;
      // eslint-disable-next-line @jessie.js/no-nested-await
      const exportDataFile = await open(pathResolve(exportDir, fileName), 'wx');
      cleanup.push(async () => exportDataFile.close());

      // eslint-disable-next-line @jessie.js/no-nested-await
      for await (const entry of swingStoreExporter.getExportData()) {
        await exportDataFile.write(`${JSON.stringify(entry)}\n`);
      }

      manifest.data = fileName;
    }
    abortIfStopped();

    for await (const artifactName of swingStoreExporter.getArtifactNames()) {
      abortIfStopped();
      log?.(`Writing artifact: ${artifactName}`);
      const artifactData = swingStoreExporter.getArtifact(artifactName);
      // Use artifactName as the file name as we trust swingStore to generate
      // artifact names that are valid file names.
      await writeFile(pathResolve(exportDir, artifactName), artifactData);
      manifest.artifacts.push([artifactName, artifactName]);
    }

    await manifestFile.write(JSON.stringify(manifest, null, 2));
    log?.(`Saved export manifest: ${manifestPath}`);
  })();

  const doCleanup = async opErr => {
    const errors = [];
    for await (const cleaner of cleanup.reverse()) {
      await Promise.resolve()
        .then(cleaner)
        .catch(err => errors.push(err));
    }
    if (errors.length) {
      const error = makeAggregateError(errors, 'Errors while cleaning up');
      if (opErr) {
        Object.defineProperty(error, 'cause', { value: opErr });
      }
      throw error;
    } else if (opErr) {
      throw opErr;
    }
  };

  const done = exportDone.then(doCleanup, doCleanup).catch(err => {
    startedKit.reject(err);
    throw err;
  });

  return {
    getBlockHeight: () => blockHeight || savedBlockHeight,
    onStarted: async () => startedKit.promise,
    onDone: async () => done,
    stop: async () => {
      stopped ||= new Error(`Interrupted`);
      return done.catch(err => {
        if (err !== stopped) {
          throw err;
        }
      });
    },
  };
};

/**
 * @param {string[]} args
 * @param {object} powers
 * @param {Partial<Record<string, string>>} powers.env
 * @param {string} powers.homedir
 * @param {Console} powers.console
 * @param {import('fs/promises')} powers.fs
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
    )}/data/ag-cosmos-chain-state`;

  const stateDirStat = await fs.stat(stateDir);
  if (!stateDirStat.isDirectory()) {
    throw new Error('state-dir must be an exiting directory');
  }

  const exportDir = pathResolve(
    /** @type {string} */ (processValue.getFlag('export-dir', '.')),
  );

  const includeExportData = processValue.getBoolean({
    flagName: 'include-export-data',
  });
  const exportMode = processValue.getFlag('export-mode');
  checkExportMode(exportMode);

  const checkBlockHeight = processValue.getInteger({
    flagName: 'check-block-height',
  });

  const { registerShutdown } = makeShutdown(false);

  const exporter = initiateSwingStoreExport(
    {
      stateDir,
      exportDir,
      blockHeight: checkBlockHeight,
      exportMode,
      includeExportData,
    },
    {
      fs,
      pathResolve,
      log: console.log,
    },
  );

  registerShutdown(() => exporter.stop());

  await exporter.onDone();
};

if (isEntrypoint(import.meta.url)) {
  main(process.argv.splice(2), {
    homedir: os.homedir(),
    env: process.env,
    console,
    fs: fsPower,
    pathResolve: pathPower.resolve,
  }).then(
    _res => 0,
    rej => {
      console.error(`error running export-kernel-db:`, rej);
      process.exit(process.exitCode || rej.exitCode || 1);
    },
  );
}
