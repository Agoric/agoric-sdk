/* global globalThis */
// @ts-check
import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeMarshal } from '@agoric/marshal';
// grumble... waitUntilQuiescent is exported and closes over ambient authority
import { waitUntilQuiescent } from '../../waitUntilQuiescent';

import { makeLiveSlots } from '../liveSlots';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // eslint-disable-next-line
  // console.log(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

/**
 * Wrap byte-level protocols with tagged array codec.
 *
 * @param { (cmd: ArrayBuffer) => ArrayBuffer } issueCommand as from xsnap
 * @typedef { [unknown, ...unknown[]] } Tagged tagged array
 */
function managerPort(issueCommand) {
  /** @type { (item: Tagged) => ArrayBuffer } */
  const encode = item => {
    let txt;
    try {
      txt = JSON.stringify(item);
    } catch (nope) {
      workerLog(nope.message, item);
      throw nope;
    }
    return encoder.encode(txt).buffer;
  };

  /** @type { (msg: ArrayBuffer) => any } */
  const decodeData = msg => JSON.parse(decoder.decode(msg) || 'null');

  /** @type { (msg: ArrayBuffer) => Tagged } */
  function decode(msg) {
    /** @type { Tagged } */
    const item = decodeData(msg);
    assert(Array.isArray(item), X`expected array`);
    assert(item.length > 0, X`empty array lacks tag`);
    return item;
  }

  return harden({
    /** @type { (item: Tagged) => void } */
    send: item => {
      issueCommand(encode(item));
    },
    /** @type { (item: Tagged) => unknown } */
    call: item => decodeData(issueCommand(encode(item))),

    /**
     * Wrap an async Tagged handler in the xsnap async reporting idiom.
     *
     * @param { (item: Tagged) => Promise<Tagged> } f async Tagged handler
     * @returns { (msg: ArrayBuffer) => Report<ArrayBuffer> } xsnap style handleCommand
     *
     * @typedef { { result?: T } } Report<T> report T when idle
     * @template T
     */
    handlerFrom(f) {
      const lastResort = encoder.encode(`exception from ${f.name}`).buffer;
      return msg => {
        const report = {};
        f(decode(msg))
          .then(item => {
            workerLog('result', item);
            report.result = encode(item);
          })
          .catch(err => {
            report.result = encode(['err', f.name, err.message]);
          })
          .catch(_err => {
            report.result = lastResort;
          });
        return report;
      };
    },
  });
}

// please excuse copy-and-paste from kernel.js
function abbreviateReplacer(_, arg) {
  if (typeof arg === 'bigint') {
    // since testLog is only for testing, 2^53 is enough.
    // precedent: 32a1dd3
    return Number(arg);
  }
  if (typeof arg === 'string' && arg.length >= 40) {
    // truncate long strings
    return `${arg.slice(0, 15)}...${arg.slice(arg.length - 15)}`;
  }
  return arg;
}

/**
 * @param { (value: void) => void } f
 * @param { string } errmsg
 */
function runAndWait(f, errmsg) {
  Promise.resolve()
    .then(f)
    .catch(err => {
      workerLog(`doProcess: ${errmsg}:`, err.message);
    });
  return waitUntilQuiescent();
}

/**
 * @param { ReturnType<typeof managerPort> } port
 */
function makeWorker(port) {
  /** @type { Record<string, (...args: unknown[]) => void> | null } */
  let dispatch = null;

  /** @type { (dr: Tagged, errmsg: string) => Promise<Tagged> } */
  async function doProcess(dispatchRecord, errmsg) {
    assert(dispatch);
    const theDispatch = dispatch;
    const [dispatchOp, ...dispatchArgs] = dispatchRecord;
    assert(typeof dispatchOp === 'string');
    workerLog(`runAndWait`);
    await runAndWait(() => theDispatch[dispatchOp](...dispatchArgs), errmsg);
    workerLog(`doProcess done`);
    /** @type { Tagged } */
    const vatDeliveryResults = harden(['ok']);
    return vatDeliveryResults;
  }

  /** @type { (ts: unknown, msg: any) => Promise<Tagged> } */
  function doMessage(targetSlot, msg) {
    const errmsg = `vat[${targetSlot}].${msg.method} dispatch failed`;
    return doProcess(
      ['deliver', targetSlot, msg.method, msg.args, msg.result],
      errmsg,
    );
  }

  /** @type { (rs: unknown) => Promise<Tagged> } */
  function doNotify(resolutions) {
    const errmsg = `vat.notify failed`;
    return doProcess(['notify', resolutions], errmsg);
  }

  /** @type { (rs: unknown) => Promise<Tagged> } */
  function doDropExports(vrefs) {
    const errmsg = `vat.dropExports failed`;
    return doProcess(['dropExports', vrefs], errmsg);
  }

  /**
   * TODO: consider other methods per SES VirtualConsole.
   * See https://github.com/Agoric/agoric-sdk/issues/2146
   *
   * @param { string } tag
   */
  function makeConsole(tag) {
    const log = level => (...args) =>
      port.send(['console', level, tag, ...args]);
    const cons = {
      debug: log('debug'),
      log: log('log'),
      info: log('info'),
      warn: log('warn'),
      error: log('error'),
    };
    return harden(cons);
  }

  /** @type { (extSrc: string) => string } */
  function transformTildot(extSrc) {
    const reply = port.call(['transformTildot', extSrc]);
    assert(Array.isArray(reply));
    if (reply[0] === 'err') throw new Error(reply[1]);
    return reply[1];
  }

  /**
   * @param {unknown} vatID
   * @param {unknown} bundle
   * @param {unknown} vatParameters
   * @param {unknown} virtualObjectCacheSize
   * @param {boolean} enableDisavow
   * @returns { Promise<Tagged> }
   */
  async function setBundle(
    vatID,
    bundle,
    vatParameters,
    virtualObjectCacheSize,
    enableDisavow,
  ) {
    /** @type { (item: Tagged) => unknown } */
    function doSyscall(vatSyscallObject) {
      workerLog('doSyscall', vatSyscallObject);
      const result = port.call(['syscall', ...vatSyscallObject]);
      workerLog(' ... syscall result:', result);
      return result;
    }

    const syscall = harden({
      send: (...args) => doSyscall(['send', ...args]),
      callNow: (...args) => doSyscall(['callNow', ...args]),
      subscribe: (...args) => doSyscall(['subscribe', ...args]),
      resolve: (...args) => doSyscall(['resolve', ...args]),
      exit: (...args) => doSyscall(['exit', ...args]),
      vatstoreGet: (...args) => doSyscall(['vatstoreGet', ...args]),
      vatstoreSet: (...args) => doSyscall(['vatstoreSet', ...args]),
      vatstoreDelete: (...args) => doSyscall(['vatstoreDelete', ...args]),
      dropImports: (...args) => doSyscall(['dropImports', ...args]),
    });

    const vatPowers = {
      makeMarshal,
      transformTildot,
      testLog: (...args) =>
        port.send([
          'testLog',
          ...args.map(arg =>
            typeof arg === 'string'
              ? arg
              : JSON.stringify(arg, abbreviateReplacer),
          ),
        ]),
    };

    const cacheSize =
      typeof virtualObjectCacheSize === 'number'
        ? virtualObjectCacheSize
        : undefined;

    const gcTools = {}; // future expansion

    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      vatParameters,
      cacheSize,
      enableDisavow,
      gcTools,
    );

    const endowments = {
      ...ls.vatGlobals,
      console: makeConsole(`SwingSet:vatWorker`),
      assert,
      // bootstrap provides HandledPromise
      HandledPromise: globalThis.HandledPromise,
    };
    const vatNS = await importBundle(bundle, { endowments });
    workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
    ls.setBuildRootObject(vatNS.buildRootObject);
    dispatch = ls.dispatch;
    assert(dispatch);
    workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
    return ['dispatchReady'];
  }

  /** @type { (item: Tagged) => Promise<Tagged> } */
  async function handleItem([tag, ...args]) {
    workerLog('handleItem', tag, args.length);
    switch (tag) {
      case 'setBundle': {
        assert(!dispatch, 'cannot setBundle again');
        const enableDisavow = !!args[4];
        return setBundle(args[0], args[1], args[2], args[3], enableDisavow);
      }
      case 'deliver': {
        assert(dispatch, 'cannot deliver before setBundle');
        const [dtype, ...dargs] = args;
        switch (dtype) {
          case 'message':
            return doMessage(dargs[0], dargs[1]);
          case 'notify':
            return doNotify(dargs[0]);
          case 'dropExports':
            return doDropExports(dargs[0]);
          default:
            assert.fail(X`bad delivery type ${dtype}`);
        }
      }
      default:
        workerLog('handleItem: bad tag', tag, args.length);
        return ['bad tag', tag];
    }
  }

  return harden({
    handleItem,
  });
}

// xsnap provides issueCommand global
const port = managerPort(globalThis.issueCommand);
const worker = makeWorker(port);
globalThis.handleCommand = port.handlerFrom(worker.handleItem);
