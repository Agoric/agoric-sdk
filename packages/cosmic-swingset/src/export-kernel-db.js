#! /usr/bin/env node
// @ts-check
// @jessie-check

import '@endo/init/unsafe-fast.js';

import os from 'os';
import process from 'process';
import fsPower from 'fs/promises';
import pathPower from 'path';
import { fileURLToPath } from 'url';

import { makePromiseKit } from '@endo/promise-kit';
import { Fail } from '@agoric/assert';
import { makeAggregateError } from '@agoric/internal';
import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';
import { openSwingStore, makeSwingStoreExporter } from '@agoric/swing-store';

import { isEntrypoint } from './helpers/is-entrypoint.js';
import { makeProcessValue } from './helpers/process-value.js';

/** @typedef {'current' | 'archival' | 'debug'} SwingStoreExportMode */

// ExportManifestFilename is the manifest filename which must be synchronized
// with the golang SwingSetSnapshotter in golang/cosmos/x/swingset/keeper/snapshotter.go
export const ExportManifestFileName = 'export-manifest.json';

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
 * @param {null | ((...args: any[]) => void)} [powers.log]
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
    const manifestPath = pathResolve(exportDir, ExportManifestFileName);
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
      const exportDataFile = await open(pathResolve(exportDir, fileName), 'wx');
      cleanup.push(async () => exportDataFile.close());

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
      stopped ||= Error(`Interrupted`);
      return done.catch(err => {
        if (err !== stopped) {
          throw err;
        }
      });
    },
  };
};

/**
 * @typedef {{type: 'started', blockHeight: number}} ExportMessageStarted
 * @typedef {{type: 'done', error?: Error}} ExportMessageDone
 * @typedef {ExportMessageStarted | ExportMessageDone} ExportMessage
 */

/**
 * @param {string[]} args
 * @param {object} powers
 * @param {Partial<Record<string, string>>} powers.env
 * @param {string} powers.homedir
 * @param {((msg: ExportMessage) => void) | null} powers.send
 * @param {Console} powers.console
 * @param {import('fs/promises')} powers.fs
 * @param {import('path')['resolve']} powers.pathResolve
 */
export const main = async (
  args,
  { env, homedir, send, console, fs, pathResolve },
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

  const includeExportData = processValue.getBoolean({
    flagName: 'include-export-data',
  });
  const exportMode = processValue.getFlag('export-mode');
  checkExportMode(exportMode);

  const checkBlockHeight = processValue.getInteger({
    flagName: 'check-block-height',
  });

  const verbose = processValue.getBoolean({
    flagName: 'verbose',
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
      log: verbose ? console.log : null,
    },
  );

  registerShutdown(() => exporter.stop());

  exporter.onStarted().then(
    () =>
      send?.({
        type: 'started',
        blockHeight: /** @type {number} */ (exporter.getBlockHeight()),
      }),
    () => {},
  );

  await exporter.onDone().then(
    () => send?.({ type: 'done' }),
    error => {
      verbose && console.error('state-sync export failed', error);
      if (send) {
        send({ type: 'done', error });
      } else {
        throw error;
      }
    },
  );
};

/**
 * @param {StateSyncExporterOptions} options
 * @param {object} powers
 * @param {typeof import('child_process')['fork']} powers.fork
 * @param {boolean} [powers.verbose]
 * @returns {StateSyncExporter}
 */
export const spawnSwingStoreExport = (
  { stateDir, exportDir, blockHeight, exportMode, includeExportData },
  { fork, verbose },
) => {
  const args = ['--state-dir', stateDir, '--export-dir', exportDir];

  if (blockHeight !== undefined) {
    args.push('--check-block-height', String(blockHeight));
  }

  if (exportMode) {
    args.push('--export-mode', exportMode);
  }

  if (includeExportData) {
    args.push('--include-export-data');
  }

  if (verbose) {
    args.push('--verbose');
  }

  const cp = fork(fileURLToPath(import.meta.url), args, {
    serialization: 'advanced', // To get error objects serialized
  });

  const kits = harden({
    /** @type {import('@endo/promise-kit').PromiseKit<void>} */
    started: makePromiseKit(),
    /** @type {import('@endo/promise-kit').PromiseKit<void>} */
    done: makePromiseKit(),
  });

  let exited = false;

  /**
   * @param {number | null} code
   * @param {NodeJS.Signals | null} signal
   */
  const onExit = (code, signal) => {
    exited = true;
    kits.done.reject(
      Error(`Process exited before done. code=${code}, signal=${signal}`),
    );
  };

  /** @type {number | undefined} */
  let exportBlockHeight;

  /** @param {import('./export-kernel-db.js').ExportMessage} msg */
  const onMessage = msg => {
    switch (msg.type) {
      case 'started': {
        exportBlockHeight = msg.blockHeight;
        kits.started.resolve();
        break;
      }
      case 'done': {
        if (msg.error) {
          kits.done.reject(msg.error);
        } else {
          kits.done.resolve();
        }
        break;
      }
      default: {
        // @ts-expect-error exhaustive check
        Fail`Unexpected ${msg.type} message`;
      }
    }
  };

  cp.on('error', kits.done.reject).on('exit', onExit).on('message', onMessage);

  void kits.done.promise
    .catch(err => {
      kits.started.reject(err);
    })
    .then(() => {
      cp.off('error', kits.done.reject)
        .off('exit', onExit)
        .off('message', onMessage);
    });

  if (cp.exitCode != null) {
    onExit(cp.exitCode, null);
  }
  return harden({
    getBlockHeight: () => blockHeight || exportBlockHeight,
    onStarted: async () => kits.started.promise,
    onDone: async () => kits.done.promise,
    stop: async () => {
      if (!exited) {
        cp.kill();
      }
      return kits.done.promise;
    },
  });
};

if (isEntrypoint(import.meta.url)) {
  main(process.argv.splice(2), {
    homedir: os.homedir(),
    env: process.env,
    send: process.send
      ? Function.prototype.bind.call(process.send, process)
      : undefined,
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
