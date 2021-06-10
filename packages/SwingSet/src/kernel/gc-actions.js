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

  function getRefCount(kref) {
    // When we check for a re-exported kref, if it's entirely missing, that
    // qualifies (to us) as a zero refcount.
    const owner = kernelKeeper.ownerOfKernelObject(kref);
    if (owner) {
      return kernelKeeper.getObjectRefCount(kref);
    }
    return { reachable: 0, recognizable: 0 };
  }

  function filterActions(groupedActions) {
    const krefs = [];
    const actions = [];
    for (const action of groupedActions) {
      const { type, kref } = parseAction(action);
      const { reachable, recognizable } = getRefCount(kref);
      // negate actions on re-exported krefs, and don't treat as work to do
      if (reachable || (type === 'retireExport' && recognizable)) {
        allActionsSet.delete(action);
      } else {
        krefs.push(kref);
        actions.push(action);
      }
    }
    for (const action of actions) {
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
  // console.log(`grouped:`, grouped);

  const vatIDs = Array.from(grouped.keys());
  vatIDs.sort();
  for (const vatID of vatIDs) {
    const forVat = grouped.get(vatID);
    // find the highest-priority type of work to do within this vat
    for (const type of typePriority) {
      if (forVat.has(type)) {
        const actions = forVat.get(type);
        const krefs = filterActions(actions);
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
