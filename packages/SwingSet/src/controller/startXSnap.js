import fs from 'fs';
import path from 'path';
import { Fail } from '@agoric/assert';
import { type as osType } from 'os';
import { xsnap, recordXSnap } from '@agoric/xsnap';

const NETSTRING_MAX_CHUNK_SIZE = 12_000_000;

/**
 * @param {{
 *   bundleHandler: import('./bundle-handler.js').BundleHandler,
 *   snapStore?: import('@agoric/swing-store').SnapStore,
 *   spawn: typeof import('child_process').spawn
 *   debug?: boolean,
 *   workerTraceRootPath?: string,
 *   overrideBundles?: import('../types-external.js').Bundle[],
 * }} options
 */
export function makeStartXSnap(options) {
  // our job is to simply curry some authorities and settings into the
  // 'startXSnap' function we return
  const {
    spawn,
    bundleHandler, // required unless bundleIDs is empty
    snapStore,
    workerTraceRootPath,
    overrideBundles,
    debug = false,
  } = options;

  let doXSnap = xsnap;

  if (workerTraceRootPath) {
    let serial = 0;
    const makeNextTraceDir = () => {
      const rel = `${workerTraceRootPath}/${serial}`;
      const workerTrace = path.resolve(rel) + path.sep;
      serial += 1;
      return workerTrace;
    };
    doXSnap = opts => {
      const workerTraceDir = makeNextTraceDir();
      console.log('SwingSet xsnap worker tracing:', { workerTraceDir });
      fs.mkdirSync(workerTraceDir, { recursive: true });
      return recordXSnap(opts, workerTraceDir, {
        writeFileSync: fs.writeFileSync,
      });
    };
  }

  /** @type { import('@agoric/xsnap/src/xsnap').XSnapOptions } */
  const xsnapOpts = {
    os: osType(),
    spawn,
    stdout: 'inherit',
    stderr: 'inherit',
    debug,
    netstringMaxChunkSize: NETSTRING_MAX_CHUNK_SIZE,
  };

  /**
   * @param {string} vatID
   * @param {string} name
   * @param {object} details
   * @param {import('../types-external.js').BundleID[]} details.bundleIDs
   * @param {(request: Uint8Array) => Promise<Uint8Array>} details.handleCommand
   * @param {boolean} [details.metered]
   * @param {boolean} [details.reload]
   */
  async function startXSnap(
    vatID,
    name,
    { bundleIDs, handleCommand, metered, reload = false },
  ) {
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

    let bundles;
    if (overrideBundles) {
      bundles = overrideBundles; // ignore the usual bundles
    } else {
      const bundlePs = bundleIDs.map(id => bundleHandler.getBundle(id));
      // eslint-disable-next-line @jessie.js/no-nested-await
      bundles = await Promise.all(bundlePs);
    }

    for (const bundle of bundles) {
      const { moduleFormat } = bundle;
      if (moduleFormat !== 'getExport' && moduleFormat !== 'nestedEvaluate') {
        throw Fail`unexpected moduleFormat: ${moduleFormat}`;
      }
      // eslint-disable-next-line no-await-in-loop, @jessie.js/no-nested-await
      await worker.evaluate(`(${bundle.source}\n)()`.trim());
    }
    return worker;
  }
  return startXSnap;
}
