import fs from 'fs';
import path from 'path';
import { Fail } from '@agoric/assert';
import { type as osType } from 'os';
import { xsnap, recordXSnap } from '@agoric/xsnap';
import { getLockdownBundle } from '@agoric/xsnap-lockdown';
import { getSupervisorBundle } from '@agoric/swingset-xsnap-supervisor';

const NETSTRING_MAX_CHUNK_SIZE = 12_000_000;

/**
 * @param {{
 *   snapStore?: SnapStore,
 *   spawn: typeof import('child_process').spawn
 *   debug?: boolean,
 *   traceFile?: string,
 *   overrideBundles?: { moduleFormat: string, source: string }[],
 * }} options
 */
export function makeStartXSnap(options) {
  // our job is to simply curry some authorities and settings into the
  // 'startXSnap' function we return
  const { snapStore, spawn, debug = false, traceFile } = options;
  const { overrideBundles } = options;

  let serial = 0;
  const makeTraceFile = traceFile
    ? () => {
        const workerTrace = path.resolve(`${traceFile}/${serial}`) + path.sep;
        serial += 1;
        return workerTrace;
      }
    : undefined;

  /**
   * @param {string} workerVersion
   * @param {string} vatID
   * @param {string} name
   * @param {(request: Uint8Array) => Promise<Uint8Array>} handleCommand
   * @param {boolean} [metered]
   * @param {boolean} [reload]
   */
  async function startXSnap(
    workerVersion,
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
    if (workerVersion === 'xsnap-v1') {
      // eslint-disable-next-line @jessie.js/no-nested-await
      bundles.push(await getLockdownBundle());
      // eslint-disable-next-line @jessie.js/no-nested-await
      bundles.push(await getSupervisorBundle());
    } else {
      throw Error(`unsupported worker version ${workerVersion}`);
    }
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
    return worker;
  }
  return startXSnap;
}
