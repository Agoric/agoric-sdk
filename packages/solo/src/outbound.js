import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';

const log = anylogger('outbound');

/**
 * @typedef {Object} TargetRecord
 * @property {(newMessages: Array<[number, string]>, acknum: number) => void} deliverator
 * @property {number} highestSent
 * @property {number} highestAck
 * @property {number} trips
 */

/**
 * @type {Map<string, TargetRecord>}
 */
const knownTargets = new Map();

function getAllMessages(mbs, target) {
  const { outbox, inboundAck } = mbs.exportToData()[target];
  const messages = Array.from(outbox);
  messages.sort((a, b) => a[0] - b[0]);
  return [messages, inboundAck];
}

export function deliver(mbs) {
  const data = mbs.exportToData();
  log.debug(`deliver`, data);
  for (const target of Object.getOwnPropertyNames(data)) {
    if (!knownTargets.has(target)) {
      log.error(`eek, no delivery method for target`, target);
      // eslint-disable-next-line no-continue
      continue;
    }
    const t = knownTargets.get(target);
    const newMessages = [];
    data[target].outbox.forEach(m => {
      const [msgnum, body] = m;
      if (msgnum > t.highestSent) {
        log.debug(`new outbound message ${msgnum} for ${target}: ${body}`);
        newMessages.push(m);
      }
    });
    newMessages.sort((a, b) => a[0] - b[0]);
    // console.debug(` ${newMessages.length} new messages`);
    const acknum = data[target].inboundAck;
    if (newMessages.length || acknum !== t.highestAck) {
      log(
        `invoking deliverator; ${newMessages.length} new messages for ${target}`,
      );
      t.deliverator(newMessages, acknum, () => getAllMessages(mbs, target));
      if (newMessages.length) {
        [t.highestSent] = newMessages[newMessages.length - 1];
      }
      t.highestAck = acknum;
    }
  }
}

export function addDeliveryTarget(target, deliverator) {
  assert(!knownTargets.has(target), X`target ${target} already added`);
  /** @type {TargetRecord} */
  const targetRecord = { deliverator, highestSent: 0, highestAck: 0 };
  knownTargets.set(target, targetRecord);
}
