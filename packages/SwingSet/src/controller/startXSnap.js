import fs from 'fs';
import path from 'path';
import { Fail } from '@agoric/assert';
import { type as osType } from 'os';
import { xsnap, recordXSnap } from '@agoric/xsnap';

const NETSTRING_MAX_CHUNK_SIZE = 12_000_000;

/**
 * @param {{ moduleFormat: string, source: string }[]} bundles
 * @param {{
 *   snapStore?: SnapStore,
 *   spawn: typeof import('child_process').spawn
 *   debug?: boolean,
 *   workerTraceRootPath?: string,
 * }} options
 */
export function makeStartXSnap(bundles, options) {
  // our job is to simply curry some authorities and settings into the
  // 'startXSnap' function we return
  const { snapStore, spawn, debug = false, workerTraceRootPath } = options;

  let serial = 0;
  const makeNextTraceDir = workerTraceRootPath
    ? () => {
        const rel = `${workerTraceRootPath}/${serial}`;
        const workerTrace = path.resolve(rel) + path.sep;
        serial += 1;
        return workerTrace;
      }
    : undefined;

  /**
   * @param {string} vatID
   * @param {string} name
   * @param {(request: Uint8Array) => Promise<Uint8Array>} handleCommand
   * @param {boolean} [metered]
   * @param {boolean} [reload]
   */
  async function startXSnap(
    vatID,
    name,
    handleCommand,
    metered,
    reload = false,
  ) {
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
    if (makeNextTraceDir) {
      doXSnap = opts => {
        const workerTraceDir = makeNextTraceDir();
        console.log('SwingSet xs-worker tracing:', { workerTraceDir });
        fs.mkdirSync(workerTraceDir, { recursive: true });
        return recordXSnap(opts, workerTraceDir, {
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
