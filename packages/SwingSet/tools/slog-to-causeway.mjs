// @ts-check

import { pipeline } from 'stream';

/**
 * @typedef {{
 *   time: number
 * }} SlogTimedEntry
 * @typedef { SlogTimedEntry & {
 *   crankNum: number,
 *   vatID: string,
 *   deliveryNum: number,
 * }} SlogVatEntry
 *
 * @typedef { SlogVatEntry & {
 *   type: 'deliver',
 *   kd: KernelDelivery,
 * }} SlogDeliveryEntry
 * @typedef { |
 *   [tag: 'message', target: string, msg: Message] |
 *   [tag: 'notify', resolutions: Array<[
 *       kp: string,
 *       desc: { fulfilled: boolean, refCount: number, data: CapData },
 *     ]>] |
 *   [tag: 'retireImports' | 'retireExports' | 'dropExports']
 * } KernelDelivery
 * @typedef {{
 *   method: string,
 *   args: CapData,
 *   result: string,
 * }} Message
 * @typedef {{
 *   body: string,
 *   slots: unknown[],
 * }} CapData
 * @typedef { SlogVatEntry & {
 *   type: 'syscall',
 *   ksc: [tag: 'invoke' | 'subscribe' | 'vatstoreGet'| 'vatstoreSet' | 'vatstoreDelete' |
 *              'dropImports' | 'retireImports' | 'retireExports' ] |
 *        [tag: 'send', target: string, msg: Message] |
 *        [tag: 'resolve', target: string,
 *         resolutions: Array<[kp: string, rejected: boolean, value: CapData]>],
 * }} SlogSyscallEntry
 *
 * @typedef { SlogTimedEntry & {
 *   type: 'create-vat',
 *   vatID: string,
 *   dynamic: boolean,
 *   description: string,
 *   name?: string,
 *   managerType: unknown,
 *   vatParameters: Record<string, unknown>,
 *   vatSourceBundle: unknown,
 * }} SlogCreateVatEntry
 * @typedef { SlogTimedEntry & {
 *   type: 'import-kernel-start' | 'import-kernel-finish'
 *       | 'vat-startup-start' | 'vat-startup-finish'
 *       | 'start-replay' | 'finish-replay'
 *       | 'start-replay-delivery' | 'finish-replay-delivery'
 *       | 'cosmic-swingset-begin-block'
 *       | 'cosmic-swingset-end-block-start' | 'cosmic-swingset-end-block-finish'
 *       | 'cosmic-swingset-deliver-inbound'
 *       | 'deliver-result' | 'syscall-result'
 *       | 'clist'
 *       | '@@more TODO'
 * }} SlogToDoEntry
 * @typedef { SlogDeliveryEntry | SlogSyscallEntry | SlogCreateVatEntry| SlogToDoEntry } SlogEntry
 */

const { freeze } = Object;

/**
 * @typedef { |
 *  'Event' | 'Got' | 'Sent' | 'Resolved' | 'Fulfilled' | 'Rejected' | 'Returned'
 * } LogClassName
 * @typedef { `log.ref_send.${LogClassName}` } LogClassT
 */
/** @type { Record<string, LogClassT> } */
const LogClass = freeze({
  Event: 'log.ref_send.Event',
  Got: 'log.ref_send.Got',
  Sent: 'log.ref_send.Sent',
  // Progressed: 'log.ref_send.Progressed',
  Resolved: 'log.ref_send.Resolved',
  Fulfilled: 'log.ref_send.Fulfilled',
  Rejected: 'log.ref_send.Rejected',
  Returned: 'log.ref_send.Returned',
});

/**
 * @typedef {{
 *   number: number,
 *   turn: {
 *     loop: string,
 *     number: number,
 *   },
 * }} Anchor
 */

/**
 *
 * cribbed from https://github.com/cocoonfx/causeway/blob/master/src/js/com/teleometry/causeway/purchase_example/workers/makeCausewayLogger.js
 */
const makeCausewayFormatter = () => {
  const self = freeze({
    /**
     * @param {string} message
     * @param {Anchor} anchor
     */
    makeGot: (message, anchor) =>
      freeze({
        class: [LogClass.Got, LogClass.Event],
        anchor,
        message,
      }),
    /**
     * @param { string } message
     * @param {LogClassT[]} refinement
     */
    makeSent: (message, refinement = []) =>
      freeze({
        class: [...refinement, LogClass.Sent, LogClass.Event],
        message,
      }),
    /** @param { string } message */
    makeReturned: message => self.makeSent(message, [LogClass.Returned]),
    /**
     * @param { string } condition
     * @param {LogClassT[]} status
     */
    makeResolved: (condition, status = []) =>
      freeze({
        class: [...status, LogClass.Resolved, LogClass.Event],
        condition,
      }),
    /** @param { string } condition */
    makeFulfilled: condition =>
      self.makeResolved(condition, [LogClass.Fulfilled]),
    /** @param { string } condition */
    makeRejected: condition =>
      self.makeResolved(condition, [LogClass.Rejected]),
  });
  return self;
};

/**
 * @param {AsyncIterable<SlogEntry>} entries
 */
async function* slogToCauseway(entries) {
  const dest = makeCausewayFormatter();

  /** @type { Map<string, SlogCreateVatEntry } */
  const vatInfo = new Map();

  /** @type { (tag: string, obj: Record<string, unknown>) => Error } */
  const notImpl = (tag, obj) =>
    Error(`not implemented: ${tag}: ${JSON.stringify(Object.keys(obj))}`);
  /** @type { (result: string, target: string, method: string) => string } */
  const msgId = (result, target, method) => `${result}<-${target}.${method}`;

  for await (const entry of entries) {
    switch (entry.type) {
      case 'import-kernel-start':
      case 'import-kernel-finish':
      case 'vat-startup-start':
      case 'vat-startup-finish':
      case 'start-replay':
      case 'finish-replay':
      case 'start-replay-delivery':
      case 'finish-replay-delivery':
      case 'cosmic-swingset-begin-block':
      case 'cosmic-swingset-end-block-start':
      case 'cosmic-swingset-end-block-finish':
      case 'cosmic-swingset-deliver-inbound':
        // irrelevant. ignore.
        break;
      case 'create-vat':
        vatInfo.set(entry.vatID, entry);
        break;
      case 'deliver': {
        const { crankNum, vatID, deliveryNum, kd } = entry;
        const { name } = vatInfo.get(vatID);
        const loop = `${vatID}:${name || '???'}`;
        switch (kd[0]) {
          case 'message': {
            const [_tag, target, { method, result }] = kd;
            yield dest.makeGot(msgId(result, target, method), {
              number: crankNum,
              turn: { loop, number: deliveryNum },
            });
            break;
          }
          case 'notify': {
            const [_tag, resolutions] = kd;
            for (const [kp] of resolutions) {
              yield dest.makeReturned(kp);
            }
            break;
          }
          case 'retireImports': // ignore
          case 'retireExports': // ignore
          case 'dropExports': // ignore
            break;
          default:
            notImpl(kd[0], { kd });
        }
        break;
      }
      case 'deliver-result': // ignore
        break;
      case 'syscall': {
        switch (entry.ksc[0]) {
          case 'invoke': // irrelevant. ignore.
          case 'subscribe': // ignore.
          case 'vatstoreGet':
          case 'vatstoreSet':
          case 'vatstoreDelete':
          case 'dropImports':
          case 'retireImports':
          case 'retireExports':
            break;
          case 'send': {
            const {
              ksc: [_, target, { method, result }],
            } = entry;
            yield dest.makeSent(msgId(result, target, method));
            break;
          }
          case 'resolve': {
            const {
              ksc: [_, _thatVat, parts],
            } = entry;
            for (const [kp, rejected, _args] of parts) {
              yield rejected ? dest.makeRejected(kp) : dest.makeFulfilled(kp);
            }
            break;
          }
          default:
            throw notImpl(entry.ksc[0], {});
        }
        break;
      }
      case 'syscall-result': // irrelevant. ignore.
        break;
      case 'clist':
        break;
      default:
        throw notImpl(entry.type, entry);
    }
  }
}

/**
 * @param {AsyncIterable<Buffer>} data
 */
async function* readJSONLines(data) {
  let buf = '';
  for await (const chunk of data) {
    buf += chunk;
    for (let pos = buf.indexOf('\n'); pos >= 0; pos = buf.indexOf('\n')) {
      const line = buf.slice(0, pos);
      yield JSON.parse(line);
      buf = buf.slice(pos + 1);
    }
  }
}

async function* writeJSONLines(items) {
  for await (const item of items) {
    yield `${JSON.stringify(item)}\n`;
  }
}

/**
 * @param {{
 *   stdin: typeof process.stdin,
 *   stdout: typeof process.stdout,
 * }} io
 */
const main = async ({ stdin, stdout }) => {
  await pipeline(
    stdin,
    readJSONLines,
    slogToCauseway,
    writeJSONLines,
    stdout,
    err => {
      if (err) throw err;
    },
  );
};

/* TODO: only call main() if this is from CLI */
/* global process */
main({
  stdin: process.stdin,
  stdout: process.stdout,
}).catch(err => {
  console.error(err);
  process.exit(1);
});
