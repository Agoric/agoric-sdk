import fs from 'fs';
import { Fail } from '@agoric/assert';
import { type as osType } from 'os';
import { xsnap, recordXSnap } from '@agoric/xsnap';
import { ExitCode } from '@agoric/xsnap/api.js';
import { getLockdownBundle } from '@agoric/xsnap-lockdown';
import { getSupervisorBundle } from '@agoric/swingset-xsnap-supervisor';

const NETSTRING_MAX_CHUNK_SIZE = 12_000_000;

/**
 * SnapStore is defined by swing-store, but we don't import that: we get it
 * from swingset as an option. To avoid an inconvenient dependency graph,
 * we define the salient methods locally.
 *
 * @typedef {<T>(vatID: string, loadRaw: (filePath: string) => Promise<T>) => Promise<T>} LoadSnapshot
 * @typedef {{ loadSnapshot: LoadSnapshot }} SnapStore
 */
/**
 * @param {{
 *   snapStore?: SnapStore,
 *   spawn: typeof import('child_process').spawn
 *   debug?: boolean,
 *   makeTraceFile?: () => string,
 *   overrideBundles?: { moduleFormat: string, source: string }[],
 * }} options
 */
export function makeStartXSnapV1(options) {
  // our job is to simply curry some authorities and settings into the
  // 'startXSnapV1' function we return
  const { snapStore, spawn, debug = false, makeTraceFile } = options;
  const { overrideBundles } = options;

  /**
   * @param {string} vatID
   * @param {string} name
   * @param {(request: Uint8Array) => Promise<Uint8Array>} handleCommand
   * @param {boolean} [metered]
   * @param {boolean} [reload]
   */
  async function startXSnapV1(
    vatID,
    name,
    handleCommand,
    metered,
    reload = false,
  ) {
    await 0; // empty synchronous prelude

    /** @type { import('@agoric/xsnap/src/xsnap').XSnapOptions } */
    const xsnapOpts = {
      os: osType(),
      spawn,
      stdout: 'inherit',
      stderr: 'inherit',
      debug,
      netstringMaxChunkSize: NETSTRING_MAX_CHUNK_SIZE,
    };

    let doXSnap = xsnap;
    if (makeTraceFile) {
      doXSnap = opts => {
        const workerTrace = makeTraceFile();
        console.log('SwingSet xs-worker tracing:', { workerTrace });
        fs.mkdirSync(workerTrace, { recursive: true });
        return recordXSnap(opts, workerTrace, {
          writeFileSync: fs.writeFileSync,
        });
      };
    }

    const meterOpts = metered ? {} : { meteringLimit: 0 };
    if (snapStore && reload) {
      // console.log('startXSnap from', { snapshotHash });
      return snapStore.loadSnapshot(vatID, async snapshot => {
        const xs = doXSnap({
          snapshot,
          name,
          handleCommand,
          ...meterOpts,
          ...xsnapOpts,
        });
        await xs.isReady();
        return xs;
      });
    }
    // console.log('fresh xsnap', { snapStore: snapStore });
    const worker = doXSnap({ handleCommand, name, ...meterOpts, ...xsnapOpts });

    let bundles = [];
    // eslint-disable-next-line @jessie.js/no-nested-await
    bundles.push(await getLockdownBundle());
    // eslint-disable-next-line @jessie.js/no-nested-await
    bundles.push(await getSupervisorBundle());
    if (overrideBundles) {
      bundles = overrideBundles; // replace the usual bundles
    }

    for (const bundle of bundles) {
      bundle.moduleFormat === 'getExport' ||
        bundle.moduleFormat === 'nestedEvaluate' ||
        Fail`unexpected: ${bundle.moduleFormat}`;
      // eslint-disable-next-line no-await-in-loop, @jessie.js/no-nested-await
      await worker.evaluate(`(${bundle.source}\n)()`.trim());
    }

    const trapMeteringFailure = err => {
      switch (err.code) {
        case ExitCode.E_TOO_MUCH_COMPUTATION:
          return 'Compute meter exceeded';
        case ExitCode.E_STACK_OVERFLOW:
          return 'Stack meter exceeded';
        case ExitCode.E_NOT_ENOUGH_MEMORY:
          return 'Allocate meter exceeded';
        default:
          // non-metering failure. crash.
          throw err;
      }
    };

    return harden({ ...worker, trapMeteringFailure });
  }
  return startXSnapV1;
}
