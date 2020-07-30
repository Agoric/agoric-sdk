import { kdebug } from './kdebug';
import { parseKernelSlot } from './parseKernelSlots';

export function deleteCListEntryIfEasy(
  vatID,
  vatKeeper,
  kpid,
  vpid,
  kernelData,
) {
  let idx = 0;
  for (const slot of kernelData.slots) {
    const { type } = parseKernelSlot(slot);
    if (type === 'promise') {
      kdebug(
        `Unable to delete ${vatID} clist entry ${kpid}<=>${vpid} because slot[${idx}]===${slot} is a promise`,
      );
      return;
    }
    idx += 1;
  }
  vatKeeper.deleteCListEntry(kpid, vpid);
}
