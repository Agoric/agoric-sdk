// @ts-check
import { assert, details as X } from '@agoric/assert';
import { makeManagerKit } from './manager-helper';

import { insistVatSyscallObject, insistVatDeliveryResult } from '../../message';
import '../../types';
import './types';

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
 *   startXSnap: (name: string, handleCommand: SyncHandler) => Promise<XSnap>,
 *   testLog: (...args: unknown[]) => void,
 * }} tools
 * @returns { VatManagerFactory }
 *
 * @typedef { { moduleFormat: 'getExport', source: string } } ExportBundle
 * @typedef { (msg: Uint8Array) => Uint8Array } SyncHandler
 * @typedef { ReturnType<typeof import('@agoric/xsnap').xsnap> } XSnap
 */
export function makeXsSubprocessFactory({
  allVatPowers: { transformTildot },
  kernelKeeper,
  kernelSlog,
  startXSnap,
  testLog,
}) {
  /**
   * @param { string } vatID
   * @param { unknown } bundle
   * @param { ManagerOptions } managerOptions
   * @param { (vso: VatSyscallObject) => VatSyscallResult } vatSyscallHandler
   */
  async function createFromBundle(
    vatID,
    bundle,
    managerOptions,
    vatSyscallHandler,
  ) {
    parentLog(vatID, 'createFromBundle', { vatID });
    const {
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      name,
    } = managerOptions;
    assert(!managerOptions.metered, 'xs-worker: metered not supported yet');
    assert(
      !managerOptions.enableSetup,
      'xs-worker: enableSetup not supported at all',
    );
    if (managerOptions.enableInternalMetering) {
      // TODO: warn+ignore, rather than throw, because the kernel enables it
      // for all vats, because the Spawner still needs it. When the kernel
      // stops doing that, turn this into a regular assert
      console.log(`xsnap worker does not support enableInternalMetering`);
    }
    const mk = makeManagerKit(
      vatID,
      kernelSlog,
      kernelKeeper,
      vatSyscallHandler,
      true,
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
        case 'console': {
          const [level, tag, ...rest] = args;
          if (typeof level === 'string' && level in console) {
            console[level](tag, ...rest);
          } else {
            console.error('bad console level', level);
          }
          return ['ok'];
        }
        case 'testLog':
          testLog(...args);
          return ['OK'];
        case 'transformTildot': {
          const [extjs] = args;
          try {
            const stdjs = transformTildot(extjs);
            // console.log({ extjs, stdjs });
            return ['ok', stdjs];
          } catch (err) {
            return ['err', err.message];
          }
        }
        default:
          assert.fail(X`unrecognized uplink message ${type}`);
      }
    }

    /** @type { (msg: Uint8Array) => Uint8Array } */
    function handleCommand(msg) {
      // parentLog('handleCommand', { length: msg.byteLength });
      const tagged = handleUpstream(JSON.parse(decoder.decode(msg)));
      return encoder.encode(JSON.stringify(tagged));
    }

    // start the worker and establish a connection
    const worker = await startXSnap(`${vatID}:${name}`, handleCommand);

    /** @type { (item: Tagged) => Promise<CrankResults> } */
    async function issueTagged(item) {
      parentLog(item[0], '...', item.length - 1);
      const result = await worker.issueStringCommand(JSON.stringify(item));
      const reply = JSON.parse(result.reply);
      assert(Array.isArray(reply));
      const [tag, ...rest] = reply;
      return { ...result, reply: [tag, ...rest] };
    }

    parentLog(vatID, `instructing worker to load bundle..`);
    const { reply: bundleReply } = await issueTagged([
      'setBundle',
      vatID,
      bundle,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
    ]);
    if (bundleReply[0] === 'dispatchReady') {
      parentLog(vatID, `bundle loaded. dispatch ready.`);
    } else {
      assert.fail(X`failed to setBundle: ${bundleReply}`);
    }

    /**
     * @param { VatDeliveryObject} delivery
     * @returns { Promise<VatDeliveryResult> }
     */
    async function deliverToWorker(delivery) {
      parentLog(vatID, `sending delivery`, delivery);
      const result = await issueTagged(['deliver', delivery]);
      parentLog(vatID, `deliverDone`, result.reply[0], result.reply.length);
      // Attach the meterUsage to the deliver result.
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
    return mk.getManager(shutdown);
  }

  return harden({ createFromBundle });
}
