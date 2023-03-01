import path from 'path';
import { makeStartXSnapV1 } from '@agoric/swingset-worker-xsnap-v1';

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

  const { traceFile, ...other } = options;
  let serial = 0;
  const makeTraceFile = traceFile
    ? () => {
        const workerTrace = path.resolve(`${traceFile}/${serial}`) + path.sep;
        serial += 1;
        return workerTrace;
      }
    : undefined;

  const startXSnapV1 = makeStartXSnapV1({ makeTraceFile, ...other });

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
    if (workerVersion === 'xsnap-v1') {
      return startXSnapV1(vatID, name, handleCommand, metered, reload);
    }
    throw Error(`unsupported worker version ${workerVersion}`);
  }

  return startXSnap;
}
