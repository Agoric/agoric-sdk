import { Fail } from '@endo/errors';
import { parseVatSlot } from './parseVatSlots.js';

/*
    Imports are in one of 5 states: UNKNOWN, REACHABLE, UNREACHABLE,
    COLLECTED, FINALIZED. Note that there's no actual state machine with those
    values, and we can't observe all of the transitions from JavaScript, but
    we can describe what operations could cause a transition, and what our
    observations allow us to deduce about the state:

    * UNKNOWN moves to REACHABLE when a crank introduces a new import
    * userspace holds a reference only in REACHABLE
    * REACHABLE moves to UNREACHABLE only during a userspace crank
    * UNREACHABLE moves to COLLECTED when GC runs, which queues the finalizer
    * COLLECTED moves to FINALIZED when a new turn runs the finalizer
    * liveslots moves from FINALIZED to UNKNOWN by syscalling dropImports

    convertSlotToVal either imports a vref for the first time, or
    re-introduces a previously-seen vref. It transitions from:

    * UNKNOWN to REACHABLE by creating a new Presence
    * UNREACHABLE to REACHABLE by re-using the old Presence that userspace
      forgot about
    * COLLECTED/FINALIZED to REACHABLE by creating a new Presence

    Our tracking tables hold data that depends on the current state:

    * slotToVal holds a WeakRef in [REACHABLE, UNREACHABLE, COLLECTED]
    * that WeakRef .deref()s into something in [REACHABLE, UNREACHABLE]
    * deadSet holds the vref only in FINALIZED
    * re-introduction must ensure the vref is not in the deadSet

    Each state thus has a set of perhaps-measurable properties:

    * UNKNOWN: slotToVal[baseRef] is missing, baseRef not in deadSet
    * REACHABLE: slotToVal has live weakref, userspace can reach
    * UNREACHABLE: slotToVal has live weakref, userspace cannot reach
    * COLLECTED: slotToVal[baseRef] has dead weakref
    * FINALIZED: slotToVal[baseRef] is missing, baseRef is in deadSet

    Our finalizer callback is queued by the engine's transition from
    UNREACHABLE to COLLECTED, but the baseRef might be re-introduced before the
    callback has a chance to run. There might even be multiple copies of the
    finalizer callback queued. So the callback must deduce the current state
    and only perform cleanup (i.e. delete the slotToVal entry and add the
    baseRef to the deadSet) in the COLLECTED state.

*/

export const makeBOYDKit = ({
  gcTools,
  getValForSlot,
  slotToVal,
  vrm,
  kernelRecognizableRemotables,
  syscall,
  possiblyDeadSet,
  possiblyRetiredSet,
}) => {
  const scanForDeadObjects = async () => {
    // `possiblyDeadSet` accumulates vrefs which have lost a supporting
    // pillar (in-memory, export, or virtualized data refcount) since the
    // last call to scanForDeadObjects. The vref might still be supported
    // by a remaining pillar, or the pillar which was dropped might be back
    // (e.g., given a new in-memory manifestation).

    const importsToDrop = new Set();
    const importsToRetire = new Set();
    const exportsToRetire = new Set();
    let doMore;
    await null;
    do {
      doMore = false;

      await gcTools.gcAndFinalize();

      // possiblyDeadSet contains a baseref for everything (Presences,
      // Remotables, Representatives) that might have lost a
      // pillar. The object might still be supported by other pillars,
      // and the lost pillar might have been reinstantiated by the
      // time we get here. The first step is to filter this down to a
      // list of definitely dead baserefs.

      const deadSet = new Set();

      for (const baseRef of possiblyDeadSet) {
        if (slotToVal.has(baseRef)) {
          continue; // RAM pillar remains
        }
        const { virtual, durable, type } = parseVatSlot(baseRef);
        assert(type === 'object', `unprepared to track ${type}`);
        if (virtual || durable) {
          if (vrm.isVirtualObjectReachable(baseRef)) {
            continue; // vdata or export pillar remains
          }
        }
        deadSet.add(baseRef);
      }
      possiblyDeadSet.clear();

      // deadSet now contains objects which are certainly dead

      // possiblyRetiredSet holds (a subset of??) baserefs which have
      // lost a recognizer recently. TODO recheck this

      for (const vref of possiblyRetiredSet) {
        if (!getValForSlot(vref) && !deadSet.has(vref)) {
          // Don't retire things that haven't yet made the transition to dead,
          // i.e., always drop before retiring

          if (!vrm.isVrefRecognizable(vref)) {
            importsToRetire.add(vref);
          }
        }
      }
      possiblyRetiredSet.clear();

      const deadBaseRefs = Array.from(deadSet);
      deadBaseRefs.sort();
      for (const baseRef of deadBaseRefs) {
        const { virtual, durable, allocatedByVat, type } =
          parseVatSlot(baseRef);
        type === 'object' || Fail`unprepared to track ${type}`;
        if (virtual || durable) {
          // Representative: send nothing, but perform refcount checking

          const [gcAgain, retirees] = vrm.deleteVirtualObject(baseRef);
          if (retirees) {
            retirees.map(retiree => exportsToRetire.add(retiree));
          }
          doMore = doMore || gcAgain;
        } else if (allocatedByVat) {
          // Remotable: send retireExport
          // for remotables, vref === baseRef
          if (kernelRecognizableRemotables.has(baseRef)) {
            kernelRecognizableRemotables.delete(baseRef);
            exportsToRetire.add(baseRef);
          }
        } else {
          // Presence: send dropImport unless reachable by VOM
          // eslint-disable-next-line no-lonely-if
          if (!vrm.isPresenceReachable(baseRef)) {
            importsToDrop.add(baseRef);

            if (!vrm.isVrefRecognizable(baseRef)) {
              // for presences, baseRef === vref
              importsToRetire.add(baseRef);
            }
          }
        }
      }
    } while (possiblyDeadSet.size > 0 || possiblyRetiredSet.size > 0 || doMore);

    if (importsToDrop.size) {
      syscall.dropImports(Array.from(importsToDrop).sort());
    }
    if (importsToRetire.size) {
      syscall.retireImports(Array.from(importsToRetire).sort());
    }
    if (exportsToRetire.size) {
      syscall.retireExports(Array.from(exportsToRetire).sort());
    }
  };

  return { scanForDeadObjects };
};
harden(makeBOYDKit);
