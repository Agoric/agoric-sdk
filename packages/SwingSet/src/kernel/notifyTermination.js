import { insistCapData } from '../lib/capdata.js';
import { kunser } from '../lib/kmarshal.js';

/**
 * @param {string} vatID
 * @param {string} vatAdminRootKref
 * @param {boolean} shouldReject
 * @param {import('@endo/marshal').CapData<unknown>} info
 * @param {(kref: string, method: string, args: unknown[], policy?: string) => void} queueToKref
 */
export function notifyTermination(
  vatID,
  vatAdminRootKref,
  shouldReject,
  info,
  queueToKref,
) {
  insistCapData(info);

  // Embedding the info capdata into the arguments list, taking advantage of
  // the fact that neither vatID (which is a string) nor shouldReject (which
  // is a boolean) can contain any slots.
  queueToKref(
    vatAdminRootKref,
    'vatTerminated',
    [vatID, shouldReject, kunser(info)],
    'logFailure',
  );
}
