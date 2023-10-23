import { kunser } from '@agoric/kmarshal';
import { insistCapData } from '../lib/capdata.js';

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

  // Embed the info capdata into the arguments list
  queueToKref(
    vatAdminRootKref,
    'vatTerminated',
    [vatID, shouldReject, kunser(info)],
    'logFailure',
  );
}
