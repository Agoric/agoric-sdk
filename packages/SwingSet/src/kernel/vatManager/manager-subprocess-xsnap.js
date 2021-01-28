// @ts-check
import { assert, details } from '@agoric/assert';
import { makeTranscriptManager } from './transcript';
import { createSyscall } from './syscall';

// eslint-disable-next-line no-unused-vars
function parentLog(first, ...args) {
  // console.error(`--parent: ${first}`, ...args);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param {{
 *   startXSnap: (name: string, handleCommand: SyncHandler) => { worker: XSnap, bundles: Record<string, ExportBundle> },
 *   kernelKeeper: KernelKeeper,
 *   testLog: (...args: unknown[]) => void,
 *   decref: (vatID: unknown, vref: unknown, count: number) => void,
 * }} tools
 * @returns { VatManagerFactory }
 *
 * @typedef { { moduleFormat: 'getExport', source: string } } ExportBundle
 * @typedef { (msg: Uint8Array) => Uint8Array } SyncHandler
 * @typedef { ReturnType<typeof import('@agoric/xsnap').xsnap> } XSnap
 * @typedef { ReturnType<typeof import('../state/kernelKeeper').default> } KernelKeeper
 * @typedef { ReturnType<typeof import('./manager-nodeworker').makeNodeWorkerVatManagerFactory> } VatManagerFactory
 * @typedef { [unknown, ...unknown[]] } Tagged
 */
export function makeXsSubprocessFactory({
  startXSnap,
  kernelKeeper,
  testLog,
  decref,
}) {
  /**
   * @param { unknown } vatID
   * @param { unknown } bundle
   * @param { ManagerOptions } managerOptions
   */
  async function createFromBundle(vatID, bundle, managerOptions) {
    parentLog('createFromBundle', { vatID });
    const { vatParameters, virtualObjectCacheSize } = managerOptions;
    assert(!managerOptions.metered, 'not supported yet');
    assert(!managerOptions.enableSetup, 'not supported at all');
    if (managerOptions.enableInternalMetering) {
      // TODO: warn+ignore, rather than throw, because the kernel enables it
      // for all vats, because the Spawner still needs it. When the kernel
      // stops doing that, turn this into a regular assert
      console.log(`xsnap worker does not support enableInternalMetering`);
    }
    const vatKeeper = kernelKeeper.getVatKeeper(vatID);
    const transcriptManager = makeTranscriptManager(
      kernelKeeper,
      vatKeeper,
      vatID,
    );

    const { doSyscall, setVatSyscallHandler } = createSyscall(
      transcriptManager,
    );

    /** @type { (vatSyscallObject: Tagged) => unknown } */
    function handleSyscall(vatSyscallObject) {
      return doSyscall(vatSyscallObject);
    }

    /** @type { (vref: unknown, count: number) => void } */
    function vatDecref(vref, count) {
      decref(vatID, vref, count);
    }

    /** @type { (item: Tagged) => unknown } */
    function handleUpstream([type, ...args]) {
      parentLog(`handleUpstream`, type, args.length);
      switch (type) {
        case 'syscall': {
          parentLog(`syscall`, args);
          const [scTag, ...vatSyscallArgs] = args;
          return handleSyscall([scTag, ...vatSyscallArgs]);
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
        case 'decref': {
          const [vref, count] = args;
          assert(typeof count === 'number');
          vatDecref(vref, count);
          return ['OK'];
        }
        default:
          throw new Error(`unrecognized uplink message ${type}`);
      }
    }

    /** @type { (msg: Uint8Array) => Uint8Array } */
    function handleCommand(msg) {
      parentLog('handleCommand', { length: msg.byteLength });
      const tagged = handleUpstream(JSON.parse(decoder.decode(msg)));
      return encoder.encode(JSON.stringify(tagged));
    }

    // start the worker and establish a connection
    const { worker, bundles } = startXSnap(`${vatID}`, handleCommand);
    for await (const [it, superCode] of Object.entries(bundles)) {
      parentLog('bundle', it);
      assert(
        superCode.moduleFormat === 'getExport',
        details`${it} unexpected: ${superCode.moduleFormat}`,
      );
      await worker.evaluate(`(${superCode.source}\n)()`.trim());
    }

    /** @type { (item: Tagged) => Promise<Tagged> } */
    async function issueTagged(item) {
      parentLog('issueTagged', item[0]);
      const txt = await worker.issueStringCommand(JSON.stringify(item));
      const reply = JSON.parse(txt);
      assert(Array.isArray(reply));
      const [tag, ...rest] = reply;
      return [tag, ...rest];
    }

    parentLog(`instructing worker to load bundle..`);
    const bundleReply = await issueTagged([
      'setBundle',
      vatID,
      bundle,
      vatParameters,
      virtualObjectCacheSize,
    ]);
    if (bundleReply[0] === 'dispatchReady') {
      parentLog(`bundle loaded. dispatch ready.`);
    } else {
      throw new Error(`failed to setBundle: ${bundleReply}`);
    }

    /** @type { (item: Tagged) => Promise<Tagged> } */
    async function deliver(delivery) {
      parentLog(vatID, `sending delivery`, delivery);
      transcriptManager.startDispatch(delivery);
      const result = await issueTagged(['deliver', ...delivery]);
      parentLog(vatID, `deliverDone`, result[0], result.length);
      transcriptManager.finishDispatch();
      return result;
    }

    async function replayTranscript() {
      transcriptManager.startReplay();
      for (const t of vatKeeper.getTranscript()) {
        transcriptManager.checkReplayError();
        transcriptManager.startReplayDelivery(t.syscalls);
        // eslint-disable-next-line no-await-in-loop
        await deliver(t.d);
      }
      transcriptManager.checkReplayError();
      transcriptManager.finishReplay();
    }

    function shutdown() {
      return worker.close();
    }

    const manager = harden({
      replayTranscript,
      setVatSyscallHandler,
      deliver,
      shutdown,
    });

    parentLog('manager', Object.keys(manager));
    return manager;
  }

  return harden({ createFromBundle });
}
