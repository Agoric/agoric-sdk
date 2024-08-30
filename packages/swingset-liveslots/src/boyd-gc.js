import { parseVatSlot } from './parseVatSlots.js';

/*
  Theory of Operation (imports/Presences)

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
    * possiblyDeadSet holds the vref only in FINALIZED
    * (TODO) re-introduction could remove the vref from possiblyDeadSet

    Each state thus has a set of perhaps-measurable properties:

    * UNKNOWN: slotToVal[baseRef] is missing, baseRef not in possiblyDeadSet
    * REACHABLE: slotToVal has live weakref, userspace can reach
    * UNREACHABLE: slotToVal has live weakref, userspace cannot reach
    * COLLECTED: slotToVal[baseRef] has dead weakref
    * FINALIZED: slotToVal[baseRef] is missing, baseRef is in possiblyDeadSet

    Our finalizer callback is queued by the engine's transition from
    UNREACHABLE to COLLECTED, but the baseRef might be re-introduced before the
    callback has a chance to run. There might even be multiple copies of the
    finalizer callback queued. So the callback must deduce the current state
    and only perform cleanup (i.e. delete the slotToVal entry and add the
    baseRef to possiblyDeadSet) in the COLLECTED state.

    Our general rule is "trust the finalizer". The GC code below
    considers a Presence to be reachable (the vref's "RAM pillar"
    remains "up") until it moves to the FINALIZED state. We do this to
    avoid race conditions between some other pillar dropping (and a
    BOYD sampling the WeakRef) while it is in the COLLECTED state. If
    we treated COLLECTED as unreachable,, then the subsequent
    finalizer callback would examine the vref a second time,
    potentially causing a vat-fatal double syscall.dropImports. This
    rule may change if/when we use FinalizationRegistry better, by
    explicitly de-registering the vref when we drop it, which JS
    guarantees will remove and pending callback from the queue. This
    may help us avoid probing the WeakRef during BOYD (instead relying
    upon the fired/not-fired state of the FR), since that probing can
    cause engines to retain objects longer than necessary.
*/

/*
  Additional notes:

  There are three categories of vrefs:
  * Presence-style (o-NN, imports, durable)
  * Remotable-style (o+NN, exportable, ephemeral)
  * Representative-style (o+vKK/II or o+dKK/II, exportable, virtual/durable)

  We don't necessarily have a Presence for every o-NN vref that the
  vat can reach, because the vref might be held in virtual/durable
  data ("vdata") while the in-RAM `Presence` object was
  dropped. Likewise the in-RAM `Representative` can be dropped while
  the o+dKK/II vref is kept REACHABLE by either vdata or an export to
  the kernel. We *do* always have a Remotable for every o+NN vref that
  the vat knows about, because Remotables are ephemeral.

  We aren't recording any information about the kernel-facing import
  status (c-list state) for Presence-style vrefs (o-NN), so we rely
  upon the invariant that you only add a vref to possiblyDeadSet if it
  was REACHABLE first. That way, possiblyDeadSet.has(vref) means that
  the import status was REACHABLE. Likewise, code should only add to
  possiblyRetiredSet if the vref was at least RECOGNIZABLE
  beforehand. This helps us avoid a vat-fatal duplicate dropImports or
  retireImports syscall.

  For imports, the lifetime is controlled by the upstream vat: we
  might drop REACHABLE today and maintain RECOGNIZABLE for days until
  the object is finally retired. For exports *we* control the
  lifetime, so when we determine an export is no longer REACHABLE, we
  delete it and retire the vref immediately, and it does not
  observably linger in the RECOGNIZABLE state. This simplifies our
  tracking, and allows the deletion of Remotables and
  Representative-type vrefs to be idempotent.

  Each vref's reachability status is determined by a set of
  "pillars". For Presence-style vrefs, there are two: the RAM pillar
  (the `Presence` object), and the vdata pillar. The vdata pillar is
  tracked in a vatstore key named `vom.rc.${vref}`, which stores the
  reachable/recognizable refcounts.

  For Representative-style vrefs, we add the export-status pillar,
  because anything that we've exported to the kernel must be kept
  alive until the kernel issues a dispatch.dropExports. That gives us
  three pillars:
  * the RAM pillar is the `Representative` object
  * the vdata pillar is stored in `vom.rc.${vref}`
  * the export-status pillar is stored in `vom.es.${vref}`

  Remotables have only the RAM pillar. When a Remotable-style vref is
  exported to the kernel, the Remotable is added to the
  `exportedRemotables` set. And when it is stored in vdata, it appears
  as a key of the `remotableRefCounts` map. That keeps the Remotable
  itself alive until the other reachability pathways have gone
  away. We don't do this for Representatives because it would violate
  our "don't use RAM for inactive virtual objects" rule.

  When an imported Presence becomes UNREACHABLE, it might still be
  RECOGNIZABLE, by virtue of being the key of one or more weak
  collections. If not, it might transit from REACHABLE directly to
  NONE. The code that reacts to the UNREACHABLE transition must check
  for recognizers, and do a retireImports right away if there are
  none. Otherwise, recognizer will remain until either the kernel
  retires the object (dispatch.retireImports), or the weak collection
  is deleted, in which case possiblyRetiredSet will be updated with
  the vref that might no longer be recognized. There will be a race
  between us ceasing to recognize the vref (which should trigger a
  syscall.retireImports), and the kernel telling us the object has
  been deleted (via dispatch.retireImports). Either one must inhibit
  the other.

  possiblyRetiredSet only cares about Presence-style vrefs, because
  they represent imports, whose lifetime is not under our control. The
  collection-deletion code will add Remotable- and Representative-
  style vrefs in possiblyRetiredSet, but we can remove and ignore
  them.

  We use slotToVal.has(vref) everywhere for our "is it still
  reachable" check, which returns true for the REACHABLE / UNREACHABLE
  / COLLECTED states, and false for the FINALIZED state. In contrast,
  getValForSlot(vref) returns false for both COLLECTED and
  FINALIZED. We want COLLECTED to qualify as "still reachable" because
  it means there's still a finalizer callback queued, which will be
  run eventually, and we need that callback to not trigger a duplicate
  drop. We use slotToVal.has() in the possiblyRetiredSet loop (to
  inhibit retirement of imported vrefs whose Presences are in the
  COLLECTED state, and which just lost a recognizer), because
  getValForSlot would allow such COLLECTED vrefs to be retired, even
  before the finalizer had fired and could do a dropImports.

  When we decide to delete a virtual object, we will delete its
  `state`, decrementing the refcounts of any objects therein, which
  might shake loose more data. So we keep looping until we've stopped
  adding things to possiblyDeadSet. The same can happen when we use
  vrm.ceaseRecognition() to delete any weak collection values keyed by
  it. We also call ceaseRecognition when we realize that a Remotable
  has been deleted. But the possiblyDeadSet processing loop cannot
  make the decision to retire a Presence-style vref: those are deleted
  outside our vat, and the kernel notifies us of the vref's retirement
  with dispatch.retireImports (which also calls ceaseRecognition). The
  only thing possiblyDeadSet can tell us about Presences is that our
  vat can no longer *reach* the vref, which means we need to do a
  syscall.dropImports, which cannot immediately release more data.

  When the kernel sends us a dispatch.bringOutYourDead (or "BOYD" for
  short), this scanForDeadObjects() will be called. This is the only
  appropriate time for the syscall behavior to depend upon engine GC
  behavior: during all other deliveries, we want the syscalls to be a
  deterministic function of delivery contents, userspace behavior, and
  vatstore data.

  During BOYD, we still try to minimize the variation of behavior as
  much as possible. The first step is to ask the engine to perform a
  full GC sweep, to collect any remaining UNREACHABLE objects, and
  allow the finalizer callbacks to run before looking at the
  results. We also sort the vrefs before processing them, to remove
  sensitivity to the exact order of finalizer invocation.

  That makes BOYD a safe time to look inside WeakRefs and make
  syscalls based on the contents, or to read the sets that are
  modified during FinalizationRegistry callbacks and make syscalls to
  query their state further. This this is the only time we examine and
  clear possiblyDeadSet and possiblyRetiredSet, or probe
  slotToVal. Outside of BOYD, in convertSlotToVal, we must probe the
  WeakRefs to see whether we must build a new Presence or
  Representative, or not, but we have carefully designed that code to
  avoid making syscalls during the unmarshalling process, so the only
  consequence of GC differences should be differences in metering and
  memory allocation patterns.

  Our general strategy is to look at the baseRefs/vrefs whose state
  might have changed, determine their new reachability /
  recognizability status, and then resolve any discrepancies between
  that status and that of other parties who need to match.

  The kernel is one such party. If the kernel thinks we can reach an
  imported o-NN vref, but we've now determined that we cannot, we must
  send a syscall.dropImports to resolve the difference. Once sent, the
  kernel will update our c-list entry to reflect the unreachable (but
  still recognizable) status. Likewise, if the kernel thinks *it* can
  recognize an exported o+NN vref, but we've just retired it, we need
  to update the kernel with a syscall.retireExports, so it can notify
  downstream vats that have weak collections with our vref as a key.

  The DB-backed `state` of a virtual object is another such party. If
  the object is unreachable, but still has state data, we must delete
  that state, and decrement refcounts it might have held.

  Our plan is summarized as:
   * outer loop
     * gcAndFinalize
     * sort possiblyDeadSet, examine each by type
       * presence (vref):
         * if unreachable:
           * dropImports
           * add to possiblyRetiredSet
       * remotable (vref):
         * if unreachable:
           * retireExports if kernelRecognizableRemotables
           * vrm.ceaseRecognition
       * VOM (baseref)
         * if unreachable:
           * deleteVirtualObject (and retireExports retirees)
       * all: remove from possiblyDeadSet
     * repeat loop if gcAgain or possiblyDeadSet.size > 0
   * now sort and process possiblyRetiredSet. for each:
     * ignore unless presence
     * if unreachable and unrecognizable: retireImport
       (that's a duplicate reachability check, but note the answer might
       be different now)
*/

/*
  BaseRef vs vref

  For multi-faceted virtual/durable objects (eg `defineKind()` with
  faceted `behavior` argument), each time userspace create a new
  instance, we create a full "cohort" of facets, passing a record of
  Representative objects (one per facet) back to the caller. Each
  facet gets is own vref, but they all share a common prefix, known as
  the "baseRef". For example, `o+d44/2` is a BaseRef for a cohort, the
  second instance created of the `o+d44` Kind, whose individual facets
  would have vrefs of `o+d44/2:0` and `o+d44/2:1`.

  We use a WeakMap to ensure that holding any facet will keep all the
  others alive, so the cohort lives and dies as a group. The GC
  tracking code needs to track the whole cohort at once, not the
  individual facets, and any data structure which refers to cohorts
  will use the BaseRef instead of a single vref. So `slotToVal` is
  keyed by a BaseRef, and its values are a cohort of facets. But
  `valToSlot` is keyed by the facets, and its values are the
  individual facet's vref.

  Most of the GC-related APIs that appear here take vrefs, but the
  exceptions are:
  * slotToVal is keyed by baseRef
  * possiblyDeadSet holds baseRefs, that's what our WeakRefs track
  * vrm.isVirtualObjectReachable takes baseRef
  * vrm.deleteVirtualObject takes baseRef, returns [bool, retireees=vrefs]
  * vrm.ceaseRecognition takes either baseRef or vref
    (if given a baseRef, it will process all the facets)

  For Presence- and Remotable- style objects, the vref and baseref are
  the same.
*/

export const makeBOYDKit = ({
  gcTools,
  slotToVal,
  vrm,
  kernelRecognizableRemotables,
  syscall,
  possiblyDeadSet,
  possiblyRetiredSet,
}) => {
  // Presence (o-NN) lifetimes are controlled by the upstream vat, or
  // the kernel. If the vref was in possiblyDeadSet, then it *was*
  // reachable before, so we can safely presume the kernel to think we
  // can reach it.

  const checkImportPresence = vref => {
    // RAM pillar || vdata pillar
    const isReachable = slotToVal.has(vref) || vrm.isPresenceReachable(vref);
    // use slotToVal.has, not getSlotForVal(), to avoid duplicate drop
    let dropImport;
    if (!isReachable) {
      dropImport = vref;
    }
    return { dropImport };
  };

  // Remotable (o+NN) lifetimes are controlled by us: we delete/retire
  // the object as soon as it becomes unreachable. We only track the
  // Remotable/Far object (the RAM pillar) directly: exports retain
  // the Remotable in the exportedRemotables set, and vdata retains it
  // as keys of the remotableRefCounts map. So when we decide the vref
  // is unreachable, the Remotable is already gone, and it had no
  // other data we need to delete, so our task is to remove any local
  // recognition records, and to inform the kernel with a
  // retireExports if kernelRecognizableRemotables says that the
  // kernel still cares.

  // note: we track export status for remotables in the
  // kernelRecognizableRemotables set, not vom.es.VREF records. We
  // don't currently track recognition records with
  // vom.ir.VREF|COLLECTION, but we should, see #9956

  const checkExportRemotable = vref => {
    let gcAgain = false;
    let exportsToRetire = [];

    // Remotables have only the RAM pillar
    const isReachable = slotToVal.has(vref);
    if (!isReachable) {
      // We own the object, so retire it immediately. If the kernel
      // was recognizing it, we tell them it is now retired
      if (kernelRecognizableRemotables.has(vref)) {
        kernelRecognizableRemotables.delete(vref);
        exportsToRetire = [vref];
        // the kernel must not have been able to reach the object,
        // else it would still be pinned by exportedRemotables
      }
      // and remove it from any local weak collections
      gcAgain = vrm.ceaseRecognition(vref);
    }
    return { gcAgain, exportsToRetire };
  };

  // Representative (o+dNN/II or o+vNN/II) lifetimes are also
  // controlled by us. We allow the Representative object to go away
  // without deleting the vref, so we must track all three pillars:
  // Representative (RAM), export, and vdata. When we decide the vref
  // is unreachable, we must delete the virtual object's state, as
  // well as retiring the object (by telling the kernel it has been
  // retired, if the kernel cares, and removing any local recognition
  // records).

  const checkExportRepresentative = baseRef => {
    // RAM pillar || (vdata pillar || export pillar)
    const isReachable =
      slotToVal.has(baseRef) || vrm.isVirtualObjectReachable(baseRef);
    let gcAgain = false;
    let exportsToRetire = [];
    if (!isReachable) {
      // again, we own the object, so we retire it immediately
      [gcAgain, exportsToRetire] = vrm.deleteVirtualObject(baseRef);
    }
    return { gcAgain, exportsToRetire };
  };

  const scanForDeadObjects = async () => {
    await null;

    // `possiblyDeadSet` holds vrefs which have lost a supporting
    // pillar (in-memory, export, or virtualized data refcount) since
    // the last call to scanForDeadObjects. The vref might still be
    // supported by a remaining pillar, or the pillar which was
    // dropped might have been restored (e.g., re-exported after a
    // drop, or given a new in-memory manifestation).

    const importsToDrop = new Set();
    const importsToRetire = new Set();
    const exportsToRetire = new Set();
    let gcAgain = false;

    do {
      gcAgain = false;
      await gcTools.gcAndFinalize();

      // process a sorted list of vref/baseRefs we need to check for
      // reachability, one at a time

      for (const vrefOrBaseRef of [...possiblyDeadSet].sort()) {
        // remove the vref now, but some deleteVirtualObject might
        // shake it loose again for a future pass to investigate
        possiblyDeadSet.delete(vrefOrBaseRef);

        const parsed = parseVatSlot(vrefOrBaseRef);
        assert.equal(parsed.type, 'object', vrefOrBaseRef);

        let res = {};
        if (parsed.virtual || parsed.durable) {
          const baseRef = vrefOrBaseRef;
          res = checkExportRepresentative(baseRef);
        } else if (parsed.allocatedByVat) {
          const vref = vrefOrBaseRef;
          res = checkExportRemotable(vref);
        } else {
          const vref = vrefOrBaseRef;
          res = checkImportPresence(vref);
        }

        // prepare our end-of-crank syscalls
        if (res.dropImport) {
          importsToDrop.add(res.dropImport);
          possiblyRetiredSet.add(res.dropImport);
        }
        for (const facetVref of res.exportsToRetire || []) {
          exportsToRetire.add(facetVref);
        }
        gcAgain ||= !!res.gcAgain;
      }

      // Deleting virtual object state, or freeing weak-keyed
      // collection entries, might shake loose more
      // objects. possiblyDeadSet and possiblyRetiredSet are added
      // when vdata vrefs are decreffed to zero, and gcAgain means that
      // something in RAM might now be free. In both cases we should
      // do another pass, including gcAndFinalize(), until we've
      // cleared everything we can.
    } while (possiblyDeadSet.size > 0 || gcAgain);

    // Now we process potential retirements, by which we really mean
    // de-recognitions, where this vat has ceased to even recognize a
    // previously unreachable-yet-recognizable
    // vref. addToPossiblyRetiredSet() is called from
    // ceaseRecognition() when a recognizer goes away, such when a
    // weak collection being deleted and it no longer recognizes all
    // its former keys. ceaseRecognition() can be called from the loop
    // above (when a Remotable-style object is deleted, or from within
    // deleteVirtualObject), or in response to a retireImport()
    // delivery. We assume possiblyRetiredSet is given vrefs of all
    // sorts, but we only care about Presence-type, because we must do
    // retireImports for them: the kernel doesn't care if/when we stop
    // recognizing our own (maybe-exported) Remotable- and
    // Representative- type vrefs.

    for (const vref of [...possiblyRetiredSet].sort()) {
      possiblyRetiredSet.delete(vref);
      const parsed = parseVatSlot(vref);
      assert.equal(parsed.type, 'object', vref);
      // not allocated by us? that makes it a Presence-type
      if (!parsed.allocatedByVat) {
        // if we're dropping the vref, checkImportPresence() already
        // did our isReachable check, so we can safely skip it (and
        // save a vatstore syscall)
        const isReachable =
          !importsToDrop.has(vref) &&
          (slotToVal.has(vref) || vrm.isPresenceReachable(vref));
        // note: the old version used getValForSlot, which treats
        // COLLECTED as unreachable, which would allow a retirement at
        // the wrong time (before the finalizer fires and does the
        // dropImport)
        const isRecognizable = isReachable || vrm.isVrefRecognizable(vref);
        if (!isRecognizable) {
          importsToRetire.add(vref);
        }
      }
    }

    // note that retiring Presence-type vrefs cannot shake loose any
    // local data, so we don't need to loop back around

    if (importsToDrop.size) {
      syscall.dropImports([...importsToDrop].sort());
    }
    if (importsToRetire.size) {
      syscall.retireImports([...importsToRetire].sort());
    }
    if (exportsToRetire.size) {
      syscall.retireExports([...exportsToRetire].sort());
    }
  };

  return { scanForDeadObjects };
};
harden(makeBOYDKit);
