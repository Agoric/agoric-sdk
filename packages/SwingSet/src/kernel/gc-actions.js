import { Fail } from '@endo/errors';
import { insistKernelType } from './parseKernelSlots.js';
import { insistVatID } from '../lib/id.js';

/**
 * @typedef {'dropExport'  | 'retireExport'  | 'retireImport'}  GCActionType
 * @typedef {'dropExports' | 'retireExports' | 'retireImports'} GCQueueEventType
 */

/**
 * The list of GC action types by descending priority.
 *
 * @type {GCActionType[]}
 */
const actionTypePriorities = ['dropExport', 'retireExport', 'retireImport'];

/**
 * A mapping of GC action type to queue event type.
 *
 * @type {Map<GCActionType, GCQueueEventType>}
 */
const queueTypeFromActionType = new Map([
  ['dropExport', 'dropExports'],
  ['retireExport', 'retireExports'],
  ['retireImport', 'retireImports'],
]);

function parseAction(s) {
  const [vatID, type, kref] = s.split(' ');
  insistVatID(vatID);
  queueTypeFromActionType.has(type) || Fail`unknown type ${type}`;
  insistKernelType('object', kref);
  return { vatID, type, kref };
}

/**
 * @param {*} kernelKeeper
 * @returns {import('../types-internal.js').RunQueueEvent | undefined}
 */
export function processGCActionSet(kernelKeeper) {
  const allActionsSet = kernelKeeper.getGCActions();
  let actionSetUpdated = false;

  // GC actions are each one of 'dropExport', 'retireExport', or
  // 'retireImport', aimed at a specific vat and affecting a specific kref.
  // They are added to the durable "GC Actions" set (stored in kernelDB) when
  // `processRefcounts` notices a refcount sitting at zero, which means some
  // vat needs to be told that an object can be freed. Before each crank, the
  // kernel calls processGCActionSet to see if there are any GC actions that
  // should be taken. All such GC actions are executed before any regular vat
  // delivery gets to run.

  // However, things might have changed between the time the action was
  // pushed into the durable set and the time the kernel is ready to execute
  // it. For example, the kref might have been re-exported: we were all set
  // to tell the exporting vat that their object isn't recognizable any more
  // (with a `dispatch.retireExport`), but then they sent a brand new copy to
  // some importer. We must negate the `retireExport` action, because it's no
  // longer the right thing to do. Alternatively, the exporting vat might
  // have deleted the object itself (`syscall.retireExport`) before the
  // kernel got a chance to deliver the `dispatch.retireExport`, which means
  // we must bypass the action as redundant (since it's an error to delete
  // the same c-list entry twice).

  // This `filterAction` function looks at each queued GC Action and decides
  // whether the current state of the c-lsits and reference counts warrants
  // permits the action to run, or if it should be negated/bypassed.

  function filterAction(vatKeeper, action, type, kref) {
    const hasCList = vatKeeper.hasCListEntry(kref);
    const isReachable = hasCList ? vatKeeper.getReachableFlag(kref) : undefined;
    const exists = kernelKeeper.kernelObjectExists(kref);
    // @ts-expect-error xxx
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

  // We process actions in groups (sorted first by vat, then by type), to
  // make it deterministic, and to ensure that `dropExport` happens before
  // `retireExport`. This examines one group at a time, filtering everything
  // in that group, and returning the survivors of the first group that
  // wasn't filtered out entirely. Our available dispatch functions take
  // multiple krefs (`dispatch.dropExports`, rather than
  // `dispatch.dropExport`), so the set of surviving krefs can all be
  // delivered to a vat in a single crank.

  // Some day we may consolidate the three GC delivery methods into a single
  // one, in which case we'll batch together an entire vat's worth of
  // actions, instead of the narrower (vat+type) group. The filtering rules
  // may need to change to support that, to ensure that `dropExport` and
  // `retireExport` can both be delivered.

  function filterActions(vatID, groupedActions) {
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const krefs = [];
    for (const action of groupedActions) {
      const { type, kref } = parseAction(action);
      if (filterAction(vatKeeper, action, type, kref)) {
        krefs.push(kref);
      }
      allActionsSet.delete(action);
      actionSetUpdated = true;
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
    for (const type of actionTypePriorities) {
      if (forVat.has(type)) {
        const actions = forVat.get(type);
        const krefs = filterActions(vatID, actions);
        if (krefs.length) {
          // at last, we act
          krefs.sort();
          // remove the work we're about to do from the durable set
          kernelKeeper.setGCActions(allActionsSet);
          const queueType = /** @type {GCQueueEventType} */ (
            queueTypeFromActionType.get(type)
          );
          return harden({ type: queueType, vatID, krefs });
        }
      }
    }
  }
  if (actionSetUpdated) {
    // remove negated items from the durable set
    kernelKeeper.setGCActions(allActionsSet);
    // return a special gc-nop event to tell kernel to record our
    // DB changes in their own crank
    return harden({ type: 'negated-gc-action', vatID: undefined });
  } else {
    return undefined; // no GC work to do and no DB changes
  }
}
harden(processGCActionSet);
