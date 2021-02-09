// @ts-check

import { insistCapData } from '../capdata';
import { makeVatRootObjectSlot } from './loadVat';

/**
 * @param {string} vatID
 * @param {string} vatAdminRootKref
 * @param {boolean} shouldReject
 * @param {CapData<unknown>} info
 * @param {(vatID: string, vatSlot: string, method: string, args: unknown, policy?: string) => string?} queueToKref
 */
export function notifyTermination(
  vatID,
  vatAdminRootKref,
  shouldReject,
  info,
  queueToKref,
) {
  insistCapData(info);
  const vatAdminRootObjectSlot = makeVatRootObjectSlot();

  // Embedding the info capdata into the arguments list, taking advantage of
  // the fact that neither vatID (which is a string) nor shouldReject (which
  // is a boolean) can contain any slots.
  const args = {
    body: JSON.stringify([vatID, shouldReject, JSON.parse(info.body)]),
    slots: info.slots,
  };

  queueToKref(
    vatAdminRootKref,
    vatAdminRootObjectSlot,
    'vatTerminated',
    args,
    'logFailure',
  );
}
