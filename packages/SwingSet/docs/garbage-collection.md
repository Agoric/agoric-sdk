# Garbage Collection in SwingSet

JavaScript is an object-oriented language, and includes automatic garbage collection as part of the specification. When an object becomes unreferenced, the engine will (eventually) delete it and reclaim the memory it used for other purposes. The language provides a small number of tools that can interact with this collection mechanism:

* `WeakMap` and `WeakSet`: like regular `Map` and `Set` except they hold their keys weakly, not strongly
* `WeakRef`: holds a weak reference to its target, and allows the target to be retrieved if still alive
* `FinalizationRegistry`: run a callback after an object has been garbage collected

SwingSet provides an environment in which vat code works "as expected", including automatic garbage collection. This includes cross-vat and cross-host references, and some (but not all) of the language's GC primitives. To maintain deterministic execution, we deny vat code access to `WeakRef` and `FinalizationRegistry`. Vats can use `WeakMap` and `WeakSet` as usual (however SwingSet replaces them with modified versions to maintain their expected properties).

This document describes the details of SwingSet's implementation, starting with a definition of terms.

# Preliminaries

## REACHABLE vs RECOGNIZABLE

To make WeakMaps and WeakSets work correctly across vats, we define two basic kinds of reachability: REACHABLE and RECOGNIZABLE. To demonstrate, the following examples build a "stash" with some methods, and then give a target "thing" object to the stash.

"Reachable" means a given piece of code has some way to produce the target object. when a caller invokes `store(thing)`, the stash can now "reach" `thing` in the closed-over `stash` variable, and `retrieve()` can be called to exercise this ability:

```js
function makeStash() {
  let stash;
  return harden({
    store(thing) {
      stash = thing;
    },
    retrieve() {
      return stash;
    }
  });
}
```

"Recognizable" means the code can recognize a target object, even if it cannot necessarily produce it. In this example, a `WeakSet` is used as a recognizer. Once the target has been submitted to `remember()`, the stash cannot produce the target object (it has no strong reference). However it can still tell if `ask()` is called with the same `thing` as before, or some unrelated object.

```js
function makeStash() {
  let recognizer = new WeakSet();
  return harden({
    remember(thing) {
      recognizer.add(thing);
    },
    ask(thing) {
      return recognizer.has(thing);
    }
  });
}
```

We use "RECOGNIZABLE" to mean "recognizable but not reachable", and "REACHABLE" to mean "both recognizable and reachable".

RECOGNIZABLE happens when the object is used as a key in a `WeakMap` or `WeakSet` entry, but not stored elsewhere. If the vat held a copy of the object to compare against (e.g. with `===`), the object would also be reachable, and we'd be in the REACHABLE state, not RECOGNIZABLE. We do not give userspace code access to the JavaScript `WeakRef` or `FinalizationRegistry` objects, so `WeakMap` and `WeakSet` are the only tools they can use to achieve recognizability without also reachability.

RECOGNIZABLE is significant because we want a WeakMap in one vat to accept keys which are Presences associated with an exported Remotable from some other vat, and we want to clean up the entries when they go away. We cannot rely upon the JavaScript engine's GC code to perform this cross-vat collection, because the inter-vat links are just data (vrefs and krefs), which are opaque to the JS engine.

## REACHABLE / UNREACHABLE / COLLECTED / FINALIZED

When tracking the reachability state of a JavaScript `Object`, we define five states:

* UNKNOWN: the boring initial and final state
* REACHABLE: userspace has some way to produce the object
* UNREACHABLE: userspace has no way to produce the object
* COLLECTED: the JS engine has realized the object is gone
* FINALIZED: a `FinalizationRegistry` callback is being run

If you had a `WeakRef` for the object, it would be "full" (i.e. `.deref()` returns a value) in the REACHABLE and UNREACHABLE states, and "empty" (`wr.deref() === undefined`) in COLLECTED and FINALIZED.

Note that there's no actual state machine with those values, and we can't observe all of the transitions from JavaScript, but we can describe what operations could cause a transition, and what our observations allow us to deduce about the state:

* UKNOWN moves to REACHABLE when a delivery introduces a new import
  * userspace holds a reference only in REACHABLE
* REACHABLE moves to UNREACHABLE only during a userspace crank
* UNREACHABLE moves to COLLECTED when GC runs, which queues the finalizer
* COLLECTED moves to FINALIZED when a new turn runs the finalizer
* liveslots moves from FINALIZED to UNKNOWN by syscalling dropImports

We have several subtle challenges to keep in mind:

* we cannot sense the difference between REACHABLE and UNREACHABLE, although we know it can only happen as userspace runs
* the transition from UNREACHABLE to COLLECTED can happen spontaneously, at any moment, whenever the engine experience memory pressure and decide to run GC
* a new delivery might re-import an object that was already on its way out
  * the liveslots `slotToVal` WeakRef will re-use the old Presence if present (REACHABLE or UNREACHABLE)
  * if we're in COLLECTED, then a finalizer callback is already queued, and will run sooner or later, so the callback must not clobber a re-import

## within-vat vs between-vat

The SwingSet kernel manages a set of abstract entities known as "SwingSet objects" and "SwingSet Promises". Within a vat, the "liveslots" layer uses concrete JavaScript `Object`s (Presences, Remotables, and Representatives) and the JavaScript `Promise` to give vat code the means to manipulate the kernel-managed objects. Vats create a Remotable, or obtain a Representative, when they want to "export" an object into the kernel (and on to some other vat). Vats receive a Presence when they "import" an object from the kernel (which was first exported by some other vat). Vats can both export a Promise and receive an imported Promise.

Within a single vat, the "liveslots" layer uses WeakRefs and a FinalizationRegistry to track when Presence, Remotable, and Representative JS `Object`s transition between the five different states listed above. Armed with this information, liveslots can update its notion of whether the abstract SwingSet entity is REACHABLE, RECOGNIZABLE, or neither by the vat as a whole. Liveslots then issues syscalls to notify the kernel of the transition. If/when this results in an object becoming unreachable and/or unrecognizable by all vats, the kernel will notify the exporting vat with a delivery like `dispatch.dropExports` or `dispatch.retireExports`.

# Within-Vat Tracking

(TODO): describe `slotToVal` (WeakRefs), `valToSlot`, `exportedRemotables`, `pendingPromises`, `importedDevices`, the `deadSet`, the `droppedRegistry` and its finalizer callbacks, the implementation of of `processDeadSet`, and the implementation of `dispatch.dropExports`, `retireExports`, and `retireImports`.


# Comms Tracking

(TODO): describe the code which tracks REACHABLE/RECOGNIZABLE for all objects the the comms object table, the "reachable" flag in each c-list entry, the code that computes the overall reachability state, and the creation and processing of remote-side `dropImports`/etc messages.

Note that the comms tracking code is not yet implemented. Until then, the comms vat will retain a strong reference to all passing objects forever.

# Cross-Vat (kernel) Tracking

(TODO): describe the c-list entry "reachable" flag, the "reachable" and "recognizable" refcounts on all kernel objects, how these are updated by clist manipulation like `mapKernelSlotToVatSlot` and `mapVatSlotToKernelSlot`. Describe how syscalls are translated from vat space to kernel space, then processed by `kernelSyscall.js` in their kernel-space form. Describe the kernelKeeper `maybeFreeKrefs` ephemeral set, `processRefcounts()`, the durable "GC actions" set, `processOneGCAction()` and how it fits into the run-queue, and how the resulting deliveries like `dispatch.dropExports` are processed by translating from kernel space into vat space (and the refcount/reachable manipulation that occurs during translation). Describe vat-to-device invocations and how their clist entries are used on both sides of the control transfer.

## syscall.dropImport Processing

Importing vats perform `syscall.dropImport` to declare an import as unreachable. The vat will not be able to emit a message (syscall.send or syscall.resolve) that includes the vref, unless and until the kernel first re-imports the vref (by including the vref in a dispatch.deliver or dispatch.notify). The vat does this when the Presence it created to represent the vref has been collected, and when the vref is not referenced by any virtualized data.

The vat may still be able to recognize the vref: the Presence might have been used as the key of a WeakMap or WeakSet. The vat will perform `syscall.retireImport` if/when it ceases to be able to recognize the vref. To preserve its identity, the clist mapping must be maintained until that point.

When the kernel translates the vat's `syscall.dropImport`, it goes through the clist to get a kref. The kernel then clears the clist entry's "reachable" flag, and decrements the kernel object's "reachable" refcount. If the resulting refcount is zero, the kref is pushed onto the `maybeFreeKrefs` set for examination during post-delivery processing as described below. No other work is necessary.

`dropImport` means the vat no longer has a Presence, and therefore its `valToSlot` and `slotToVal` tables will not have an entry for the vref. (Virtualized data may still know the vref in a key somewhere, but there is no Presence for it, nor any way to get one without the kernel's help).

## syscall.retireImport Processing

Importing vats perform `syscall.retireImport` when they can neither reach nor recognize an import. If the Presence was never used in virtualized data or as a weak key, this will happen at the end of the crank in which the Presence is collected. Otherwise, the vat may do `syscall.dropImport` now, and `syscall.retireImport` much later.

The kernel translates `syscall.retireImport` into kernelspace (krefs), deletes the importing vat's clist entry, and decrements the kernel object's "recognizable" refcount. If this results in zero, the kref is pushed onto the `maybeFreeKrefs` list for post-delivery processing as described below. No other work is necessary.

## syscall.retireExport Processing

When a vat exports a Remotable or Representative, that object remains "reachable" until the kernel informs the vat otherwise by calling `dispatch.dropExport`. Once that has happened, liveslots stops holding a strong reference on the export, and if nothing else in the vat is keeping it alive, the Remotable will eventually be collected. When the finalizer fires, the exporting vat knows that it will never again emit a message that references the object.

At this point, the exporting vat performs `syscall.retireExport` to inform the kernel. This means the vat no longer has a Remotable (or a virtual object is no longer reachable), and its `valToSlot` and `slotToVal` tables will not have an entry for the vref. In addition, since this is the *exporting* vat, we know the vref appears nowhere else in the vat (if it were kept alive by virtualized data, it would not retire the export, and if it were used as a key in a weak collection, that collection's entry will be removed once the vref is unreachable).

The kernel translates the `syscall.retireExport` into kernelspace (krefs), and deletes the importing vat's clist entry. Then it consults the kernel object table to get a list of subscribers (vats which have the kref in their own clists). For each subscribing vat, the kernel adds a `retireImport ${vatID} ${kref}` item to the GC action set (described below). Then the kernel decrefs any auxilliary data the kernel object might have had (which may push krefs onto `makybeFreeKrefs`). Finally the kernel deletes the kernel object table entry, and returns control to the exporting vat.

At this point, the kref is only referenced in the queued `retireImport` action and the importing vats' clists. We know these vats cannot export the kref (their "reachable" flag is clear, otherwise the exporting vat couldn't have retired it). So nothing can save the kref. Eventually the `retireImport` actions will be processed, as described below. The kernel will translate the kref through the subscribing vat's clist, delete the clist entry, then deliver the message. The vat reacts to `dispatch.retireImport` by notifying any weak collections about the vref, which can delete the virtual entry indexed by it. This may provoke more drops or retirements.

## Post-Decref Processing

Those three syscalls may cause some krefs to become eligible for release. The "kernelKeeper" tracks these krefs in an ephemeral `Set` named `maybeFreeKrefs`. Every time a decrement causes the reachable count to transition from 1 to 0, or the recognizable count to transition from 1 to 0, the kref is added to this set.

After the VatManager has completed the delivery (and we've decided to commit the crank, rather than unwind it), the kernel calls `processRefcounts()` to perform any garbage collection that might be possible. This walks `maybeFreeKrefs`, looking for ones that can be collected, and possibly adds actions that must be taken to a durable "GC action Set" (stored in the DB).

The kernel may employ "break before make" transitions, so being placed on this list is not a guarantee that the kref will be released. For example, unpipelined messages sent to an unresolved promise are kept on a per-promise queue, and when the promise is resolved, each message is moved from that queue to the kernel's run-queue. Any arguments in those messages are held alive by a reference count associated with the message. The kernel might decrement the count first, when pulling the message off the promise's queue, before incrementing it again, when pushing it onto the run-queue. Reference counts are not considered authoritative until the current delivery is complete.

As a result, `processRefcounts()` must ignore items whose refcounts are no longer zero. The `maybeFreeKeys` Set is a performance-improving hint, nothing more. It would be correct (although hugely inefficient) for `processRefcounts()` to simply examine every kref in the entire kernel.

The general process of `processRefcounts` is:

* pull a kref from `maybeFreeKrefs`
* examine the state to see if it can actually be dropped and/or retired
* if so, make the necessary state changes to reflect the drop/retire and add the kref to the GC action set for the necessary vat notifications
* those state changes may add more items to `maybeFreeKrefs`
* repeat until `maybeFreeKrefs` is empty
* commit the delivery and the updated GC action set

Then, when the kernel is considering pulling an item off the run-queue, it should first consult the GC action set for notices that can be delivered. These are processed like regular vat deliveries, just at a higher priority. They cause `dispatch.dropExport`, `dispatch.retireImport`, and `dispatch.retireExport` deliveries. These deliveries may cause more drop/retire syscalls, queueing more GC deliveries. As a matter of scheduling policy, the kernel will complete all GC work before doing any normal vat deliveries. However it may hit a block meter limit first, in which case the GC work will be resumed in the next block (possibly with device input events interleaved).

Between deliveries, `maybeFreeKrefs` will be empty (syscalls add to it, post-delivery GC processing in `processRefcounts` drains it). After a delivery, the GC action set may contain work to do. All of this work is completed before begining a regular `dispatch.deliver`/`.notify` delivery.

The specific sequence is:

* pull an item off `maybeFreeKrefs`, examine its refcounts to see if it really can be released, or if it was caught by some other reference
* any `promise` with a zero refcount can be deleted:
  * we only retire *resolved* promises, so the promise table entry will have no queued messages
  * we delete the resolution data, which decrements both reachable+recognizable counts for any krefs it used to contain
  * no vat needs to be notifed about the promise deletion itself, however this might trigger the release of objects, which may eventually cause vats to be notified about something else
* any reachable `object` with a zero reachability count can be dropped (but not retired)
  * we look up the exporting vat (`.owner`) and check the reachability flag in its c-list entry
  * if the flag is clear, the vat already knows the object is unreachable, and we stop processing
  * if set, add `dropExport ${vatID} ${kref}` to the action set (if not already present)
  * you could say the final `syscall.dropImport` creates a tension between the reachable count and the exporting clist's reachability flag
    * this tension is partially relieved by adding a dropExport to the action set
    * it is fully relieved by delivering a `dispatch.dropExport` and clearing the reachability flag
    * the stable state (no work to be done) is a zero reachability count and a cleared reachability flag
* any existing `object` with zero recognizability count can be retired
  * the reachable count should always be zero (a general invariant is that the reachable count is never larger than the recognizable count )
  * either the exporting vat c-list reachability flag should already be clear, or there should be a `dropExport` for it in the action set
    * it is frequently the case that both reachable+recognizable counts reach zero at the same time
    * `processRefcounts` reacts to this by pushing both `dropExport` and `retireExport` to the action set
  * add `retireExport ${vatID} ${kref}` to the action set (if not already present)

When processing the GC action set, the kernel should sort the items and batch them by vatID, to improve determinism. For now, we make up to three deliveries per vat: `retireImports`, `dropExports`, `retireExports`. Eventually we may merge these three into a single delivery. One ordering invariant must be maintained: when both `dropExport` and `retireExport` for the same kref are in the set, the `retireExport` must not be delivered before the `dropExport`.

To allow the actions to span multiple blocks, `processGCActions` needs to take the durable set and choose a single (vatID, action-type) pair to deliver. It should remove those actions from the set and make the delivery, then commit both the removal and the delivery consequences back to the DB. Then it should either return control to the host application (if a block limit has been reached) or repeat, until the durable action set is empty.

The algorithm for a single `processOneGCAction` step is:

* prepare three Sets, one for each action type
* copy the full set out of the durable storage into an ephemeral Set
* iterate through that set, collating into `items[vatID][type] = [krefs..]`
* loop through all vatIDs in sorted order
  * loop through types in priority order: `dropExports` first, then `retireExports`, then `retireImports`
    * loop through all krefs in that list
      * check the reachable count: if non-zero, delete it from the ephemeral Set, skip
        * (that means it is "re-reachable": it was re-exported between `processRefcounts` and `processOneGCAction`, and is no longer eligible for action)
        * this could happen if the block ends before finishing all GC actions, and a timer wakeup message is queued by the timer device between blocks, and that message references some export which was just about to be `dropExport`ed
      * for `retireExports`, check the recognizable count: if non-zero, delete from set and skip
        * this could happen if 1: object is released entirely, 2: `processOneGCAction` delivers the `dropExports`, 3: vat re-exports the reference, 4: importing vats drop, but do not retire, the object, 5: `processOneGCAction` delivers the new `dropExports`, 6: `processOneGCAction` finally gets down to the pending `retireExports`
    * if any krefs survived the reachablility check, exit the loops with `vatID, type, krefs` tuple
* we now either have a `vatID, type, krefs` set of actions to take, or we know there are no actions to take
* remove the selected actions (if any) from the ephemeral set, leaving the rest for a future call to `processOneGCAction`
* write the ephemeral set back to durable storage
* if there are actions to take:
  * prepare a delivery of the given type
  * execute the delivery in its own crank
* commit the DB results, which will include multiple changes:
  * the removals we made from the durable `gcActions` set (actions taken and re-reachable krefs)
  * vat transcript additions reflecting the delivery
  * syscalls (e.g. `vatstoreDelete`) made during the delivery
  * new `gcActions` additions caused by any GC syscalls the vat made
* finish, with a return value that indicates whether any delivery was made or not

Then `kernel.step()` just calls `processOneGCAction()` first, and only proceeds to pull a regular delivery off the run-queue if it indicated that no GC work was done.

The delivery of each GC action is processed as follows:

* the `dropExport ${vatID} ${kref}` action will:
  * translate the message into vat space (kref to vref)
  * clear the reachable flag in the clist entry
  * deliver the `dropExport` (which might provoke more GC syscalls, but should not run user code)
  * so the vat's notion of dropped-or-not always matches its clist's reachability flag
  * note that we do not delete the `ko$NN` kernelDB data at this point, because:
    * the object retains its identity until retired (which cannot happen until it is fully unrecognizable)
    * any #2069 auxilliary data is part of the object's identity, and must be retained until the object is retired
* the `retireExport ${vatID} ${kref}` action will:
  * decref any auxdata slots
  * delete the kernel object table entry and auxdata
  * build the `dispatch.retireExport` object
  * translate it into vatspace through the exporting vat's clist
  * delete the clist entry
  * deliver the `dispatch.retireExport`
  * note that if we're retiring the export, it means that there are no remaining importing vats, which means there's nobody else to notify
* the `retireImport ${vatID} ${kref}` action will:
  * build a `dispatch.retireImport` message
  * translate the kref through the subscribing vat's clist
  * delete the clist entry
  * deliver the message
    * the vat reacts to `dispatch.retireImport` by notifying any weak collections about the vref, which can delete the virtual entry indexed by it
    * this may provoke more drops or retirements
