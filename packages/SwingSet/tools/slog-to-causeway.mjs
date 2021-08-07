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
 * @typedef { |
 *   [tag: 'message', target: string, msg: { method: string }] |
 *   [tag: 'notify']
 * } KernelDelivery
 * @typedef { SlogVatEntry & {
 *   type: "delivery",
 *   kd: KernelDelivery,
 * }} SlogDeliveryEntry
 * @typedef { SlogVatEntry & {
 *   type: "syscall",
 * }} SlogSyscallEntry
 * @typedef { SlogTimedEntry & {
 *   type: "TODO"
 * }} SlogToDoEntry
 * @typedef { SlogDeliveryEntry | SlogSyscallEntry | SlogToDoEntry } SlogEntry
 */

const { freeze } = Object;

const LogClass = freeze({
  Event: 'log.ref_send.Event',
  Got: 'log.ref_send.Got',
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

const makeCausewayFormatter = () => {
  return freeze({
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
  });
};

/**
 * @param {AsyncIterable<SlogEntry>} entries
 */
async function* slogToCauseway(entries) {
  const dest = makeCausewayFormatter();
  for await (const entry of entries) {
    switch (entry.type) {
      case 'delivery': {
        const { crankNum, vatID, deliveryNum, kd } = entry;
        const msgId =
          kd[0] === 'message'
            ? `${kd[1]}.${kd[2].method}@${entry.vatID}`
            : 'TODO';
        yield dest.makeGot(msgId, {
          number: crankNum,
          turn: { loop: vatID, number: deliveryNum },
        });
        break;
      }
      default:
        throw Error(`not implemented: ${entry.type}`);
    }
  }
}

/**
 * @param {AsyncIterable<string>} data
 */
async function* readJSONLines(data) {
  let buf = '';
  for await (const chunk of data) {
    buf += chunk;
    for (let pos = buf.indexOf('\n'); pos >= 0; pos = buf.indexOf('\n')) {
      yield JSON.parse(buf.slice(0, pos));
      buf = buf.slice(pos);
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
      throw err;
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
