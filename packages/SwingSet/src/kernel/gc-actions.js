import { assert } from '@agoric/assert';
import { insistKernelType } from './parseKernelSlots';
import { insistVatID } from './id';

const typePriority = ['dropExport', 'retireExport', 'retireImport'];

function parseAction(s) {
  const [vatID, type, kref] = s.split(' ');
  insistVatID(vatID);
  assert(typePriority.includes(type), `unknown type ${type}`);
  insistKernelType('object', kref);
  return { vatID, type, kref };
}

export function processNextGCAction(kernelKeeper) {
  const allActionsSet = kernelKeeper.getGCActions();

  function filterAction(vatKeeper, action, type, kref) {
    const hasCList = vatKeeper.hasCListEntry(kref);
    const isReachable = hasCList ? vatKeeper.getReachableFlag(kref) : undefined;
    const exists = kernelKeeper.kernelObjectExists(kref);
    const { reachable, recognizable } = exists
      ? kernelKeeper.getObjectRefCount(kref)
      : {};

    if (type === 'dropExport') {
      if (!exists) return false; // already, shouldn't happen
      if (reachable) return false; // negated
      if (!hasCList) return false; // already, shouldn't happen
      if (!isReachable) return false; // already, shouldn't happen
    }
    if (type === 'retireExport') {
      if (!exists) return false; // already
      if (reachable || recognizable) return false; // negated
      if (!hasCList) return false; // already
    }
    if (type === 'retireImport') {
      if (!hasCList) return false; // already
    }
    return true;
  }

  function filterActions(vatID, groupedActions) {
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const krefs = [];
    for (const action of groupedActions) {
      const { type, kref } = parseAction(action);
      if (filterAction(vatKeeper, action, type, kref)) {
        krefs.push(kref);
      }
      allActionsSet.delete(action);
    }
    return krefs;
  }

  const grouped = new Map(); // grouped.get(vatID).get(type) = krefs to process
  for (const action of allActionsSet) {
    const { vatID, type } = parseAction(action);
    if (!grouped.has(vatID)) {
      grouped.set(vatID, new Map());
    }
    const forVat = grouped.get(vatID);
    if (!forVat.has(type)) {
      forVat.set(type, []);
    }
    forVat.get(type).push(action);
  }

  const vatIDs = Array.from(grouped.keys());
  vatIDs.sort();
  for (const vatID of vatIDs) {
    const forVat = grouped.get(vatID);
    // find the highest-priority type of work to do within this vat
    for (const type of typePriority) {
      if (forVat.has(type)) {
        const actions = forVat.get(type);
        const krefs = filterActions(vatID, actions);
        if (krefs.length) {
          // at last, we act
          krefs.sort();
          // remove the work we're about to do from the durable set
          kernelKeeper.setGCActions(allActionsSet);
          return harden({ type: `${type}s`, vatID, krefs });
        }
      }
    }
  }
  // remove negated items from the durable set
  kernelKeeper.setGCActions(allActionsSet);
  return undefined; // no GC work to do
}
harden(processNextGCAction);
