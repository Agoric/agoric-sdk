/* eslint-env node */
import anylogger from 'anylogger';

import { Fail } from '@endo/errors';

// Limit the debug log length.
const SOLO_MAX_DEBUG_LENGTH =
  Number(process.env.SOLO_MAX_DEBUG_LENGTH) || undefined;

const log = anylogger('outbound');

/**
 * @typedef {object} TargetRecord
 * @property {(newMessages: Array<[number, string]>, acknum: number) => void} deliverator
 * @property {number} highestSent
 * @property {number} highestAck
 * @property {number} [trips]
 */

/**
 * @type {Map<string, TargetRecord>}
 */
const knownTargets = new Map();

export function deliver(mbs) {
  const data = mbs.exportToData();
  log.debug(`deliver`, data);
  for (const target of Object.getOwnPropertyNames(data)) {
    if (!knownTargets.has(target)) {
      log.error(`eek, no delivery method for target`, target);

      continue;
    }
    const t = knownTargets.get(target);
    const newMessages = [];
    for (const m of data[target].outbox) {
      const [msgnum, body] = m;
      if (msgnum > t.highestSent) {
        log.debug(
          `new outbound message ${msgnum} for ${target}: ${body}`.slice(
            0,
            SOLO_MAX_DEBUG_LENGTH,
          ),
        );
        newMessages.push(m);
      }
    }
    newMessages.sort((a, b) => a[0] - b[0]);
    // console.debug(` ${newMessages.length} new messages`);
    const acknum = data[target].inboundAck;
    if (newMessages.length || acknum !== t.highestAck) {
      log(
        `invoking deliverator; ${newMessages.length} new messages for ${target}`,
      );
      t.deliverator(newMessages, acknum);
      if (newMessages.length) {
        [t.highestSent] = newMessages[newMessages.length - 1];
      }
      t.highestAck = acknum;
    }
  }
}

export function addDeliveryTarget(target, deliverator) {
  !knownTargets.has(target) || Fail`target ${target} already added`;
  /** @type {TargetRecord} */
  const targetRecord = { deliverator, highestSent: 0, highestAck: 0 };
  knownTargets.set(target, targetRecord);
}
