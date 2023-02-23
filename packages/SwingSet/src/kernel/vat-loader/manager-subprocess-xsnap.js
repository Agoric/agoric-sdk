import { assert, Fail, q } from '@agoric/assert';
import { ExitCode } from '@agoric/xsnap/api.js';
import { makeManagerKit } from './manager-helper.js';

import {
  insistVatSyscallObject,
  insistVatDeliveryResult,
} from '../../lib/message.js';
import '../../types-ambient.js';
import './types.js';

/**
 * @typedef {import('@agoric/swingset-liveslots').VatDeliveryObject} VatDeliveryObject
 * @typedef {import('@agoric/swingset-liveslots').VatDeliveryResult} VatDeliveryResult
 * @typedef {import('@agoric/swingset-liveslots').VatSyscallObject} VatSyscallObject
 * @typedef {import('@agoric/swingset-liveslots').VatSyscallResult} VatSyscallResult
 * @typedef {import('@agoric/swingset-liveslots').LiveSlotsOptions} LiveSlotsOptions
 */

// eslint-disable-next-line no-unused-vars
function parentLog(first, ...args) {
  // console.error(`--parent: ${first}`, ...args);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param {{
 *   allVatPowers: VatPowers,
 *   kernelKeeper: KernelKeeper,
 *   kernelSlog: KernelSlog,
 *   startXSnap: (vatID: string, name: string, handleCommand: AsyncHandler, metered?: boolean, reload?: boolean) => Promise<XSnap>,
 *   testLog: (...args: unknown[]) => void,
 * }} tools
 * @returns {VatManagerFactory}
 *
 * @typedef { { moduleFormat: 'getExport', source: string } } ExportBundle
 * @typedef { (msg: Uint8Array) => Promise<Uint8Array> } AsyncHandler
 */
export function makeXsSubprocessFactory({
  kernelKeeper,
  kernelSlog,
  startXSnap,
  testLog,
}) {
  /**
   * @param {string} vatID
   * @param {unknown} bundle
   * @param {ManagerOptions} managerOptions
   * @param {LiveSlotsOptions} liveSlotsOptions
   * @param {(vso: VatSyscallObject) => VatSyscallResult} vatSyscallHandler
   */
  async function createFromBundle(
    vatID,
    bundle,
    managerOptions,
    liveSlotsOptions,
    vatSyscallHandler,
  ) {
    parentLog(vatID, 'createFromBundle', { vatID });
    const {
      name: vatName,
      metered,
      compareSyscalls,
      useTranscript,
      sourcedConsole,
    } = managerOptions;
    assert(
      !managerOptions.enableSetup,
      'xs-worker: enableSetup not supported at all',
    );
    assert(useTranscript, 'xs-worker: useTranscript=false not supported');

    const mk = makeManagerKit(
      vatID,
      kernelSlog,
      kernelKeeper,
      vatSyscallHandler,
      true,
      compareSyscalls,
      useTranscript,
    );

    /** @type { (item: Tagged) => unknown } */
    function handleUpstream([type, ...args]) {
      parentLog(vatID, `handleUpstream`, type, args.length);
      switch (type) {
        case 'syscall': {
          parentLog(vatID, `syscall`, args[0], args.length);
          const vso = args[0];
          insistVatSyscallObject(vso);
          return mk.syscallFromWorker(vso);
        }
        case 'sourcedConsole': {
          const [source, level, ...rest] = args;
          // Choose the right console.
          if (typeof level === 'string' && level in sourcedConsole) {
            sourcedConsole[level](source, ...rest);
          } else {
            console.error(`bad ${type} level`, level);
          }
          return ['ok'];
        }
        case 'testLog': {
          testLog(...args);
          return ['OK'];
        }
        default: {
          throw Fail`unrecognized uplink message ${type}`;
        }
      }
    }

    /** @type { (msg: Uint8Array) => Promise<Uint8Array> } */
    async function handleCommand(msg) {
      // parentLog('handleCommand', { length: msg.byteLength });
      const tagged = handleUpstream(JSON.parse(decoder.decode(msg)));
      return encoder.encode(JSON.stringify(tagged));
    }

    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const snapshotInfo = vatKeeper.getSnapshotInfo();
    if (snapshotInfo) {
      kernelSlog.write({ type: 'heap-snapshot-load', vatID, ...snapshotInfo });
    }

    // `startXSnap` adds `argName` as a dummy argument so that 'ps'
    // shows which worker is for which vat, but is careful to prevent
    // a shell-escape attack
    const argName = `${vatID}:${vatName !== undefined ? vatName : ''}`;

    // start the worker and establish a connection
    const worker = await startXSnap(
      vatID,
      argName,
      handleCommand,
      metered,
      !!snapshotInfo,
    );

    /** @type { (item: Tagged) => Promise<WorkerResults> } */
    async function issueTagged(item) {
      parentLog(item[0], '...', item.length - 1);
      const result = await worker.issueStringCommand(JSON.stringify(item));
      // note: if 'result.reply' is empty, that probably means the
      // worker reached end-of-crank (idle) without seeing the
      // `dispatch()` promise resolve
      const reply = JSON.parse(result.reply);
      assert(Array.isArray(reply));
      const [tag, ...rest] = reply;
      return { ...result, reply: [tag, ...rest] };
    }

    if (snapshotInfo) {
      parentLog(vatID, `snapshot loaded. dispatch ready.`);
    } else {
      parentLog(vatID, `instructing worker to load bundle..`);
      // eslint-disable-next-line @jessie.js/no-nested-await
      const { reply: bundleReply } = await issueTagged([
        'setBundle',
        vatID,
        bundle,
        liveSlotsOptions,
      ]);
      if (bundleReply[0] === 'dispatchReady') {
        parentLog(vatID, `bundle loaded. dispatch ready.`);
      } else {
        const [_tag, errName, message] = bundleReply;
        Fail`setBundle failed: ${q(errName)}: ${q(message)}`;
      }
    }

    /**
     * @param { VatDeliveryObject} delivery
     * @returns {Promise<VatDeliveryResult>}
     */
    async function deliverToWorker(delivery) {
      parentLog(vatID, `sending delivery`, delivery);
      /** @type { WorkerResults } */
      let result;
      try {
        // eslint-disable-next-line @jessie.js/no-nested-await
        result = await issueTagged(['deliver', delivery]);
      } catch (err) {
        parentLog('issueTagged error:', err.code, err.message);
        let message;
        switch (err.code) {
          case ExitCode.E_TOO_MUCH_COMPUTATION:
            message = 'Compute meter exceeded';
            break;
          case ExitCode.E_STACK_OVERFLOW:
            message = 'Stack meter exceeded';
            break;
          case ExitCode.E_NOT_ENOUGH_MEMORY:
            message = 'Allocate meter exceeded';
            break;
          default:
            // non-metering failure. crash.
            throw err;
        }
        return harden(['error', message, null]);
      }

      parentLog(vatID, `deliverDone`, result.reply[0], result.reply.length);
      // Attach the meterUsage to the deliver result.
      /** @type { VatDeliveryResult } */
      // @ts-expect-error I don't know how to appease tsc
      const deliverResult = harden([
        result.reply[0], // 'ok' or 'error'
        result.reply[1] || null, // problem or null
        result.meterUsage || null, // meter usage statistics or null
      ]);
      insistVatDeliveryResult(deliverResult);
      return deliverResult;
    }
    mk.setDeliverToWorker(deliverToWorker);

    function shutdown() {
      return worker.close().then(_ => undefined);
    }
    /**
     * @param {number} endPos
     * @param {SnapStore} snapStore
     * @returns {Promise<SnapshotResult>}
     */
    function makeSnapshot(endPos, snapStore) {
      return snapStore.saveSnapshot(vatID, endPos, fn => worker.snapshot(fn));
    }

    return mk.getManager(shutdown, makeSnapshot);
  }

  return harden({ createFromBundle });
}
