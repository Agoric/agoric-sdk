# Promise/VPID Management in Liveslots

Kernels and vats communicate about promises by referring to their VPIDs: vat(-centric) promise IDs. These are strings like `p+12` and `p-23`. Like VOIDs (object IDs), the plus/minus sign indicates which side of the boundary allocated the number (`p+12` and `o+12` are allocated by the vat, `p-13` and `o-13` are allocated by the kernel). But where the object ID sign also indicates which side "owns" the object (i.e. where the behavior lives), the promise ID sign is generally irrelevant.

Instead, we care about which side holds the resolution authority. This is not indicated by the VPID sign, and in fact is not necessarily static. Liveslots does not currently have any mechanism to allow one promise to be forwarded to another, but if it acquires this some day, then the decider of a promise could shift from kernel to vat to kernel again before it finally gets resolved. And there *is* a sequence that allows a vat to receive a reference to a promise in method arguments first, then receive a message whose result promise uses that VPID second (`p1 = p2~.foo(); x~.bar(p1)`, then someone resolves `p2` to `x`). In this case, the decider is initially the kernel, then the authority is transferred to the vat later.

Each `Promise` starts out in the "unresolved" state, then later transitions irrevocably to the "resolved" state. Liveslots frequently (but not always) pays attention to this transition by calling `.then`, to attach a callback. To handle resolution cycles, liveslots remembers the resolution of old promises in a `WeakMap` for as long as the `Promise` exists. Consequently, for liveslots' purposes, every `Promise` is either resolved (the callback has fired and liveslots remembers the resolution), or unresolved (liveslots has not yet seen a resolution).

There are roughly four ways that liveslots might become aware of a promise:

* serialization: a `Promise` instance is serialized, either for the arguments of an outbound `syscall.send` or `syscall.resolve`, the argument of `watchPromise()`, or to be stored into virtualized data (e.g. `bigMapStore.set(key, promise)`, or assignment to a property of a virtual object)
* creation for outbound result: liveslots allocates a VPID for the `.result` of an outbound `syscall.send`, and creates a new `Promise` instance to give back to userspace
* deserialization: the arguments of an inbound `dispatch.deliver` or `dispatch.notify` are deserialized, and a new `Promise` instance is created
* inbound result: the kernel-allocated `.result` VPID of an inbound `dispatch.deliver` is associated with the `Promise` we get back from `HandledPromise.applyMethod`

A `Promise` may be associated with a VPID even though the kernel does not know about it (i.e. the VPID is not in the c-list): this can occur when a Promise is merely stored into virtual data without also being sent to (or received from) the kernel. The kernel's knowledge is temporary: once the promise is resolved (either `syscall.resolve` or `dispatch.notify`), the VPID is retired from the vat's c-list. So a VPID might start out stored only in vdata, then get sent to the kernel, then get resolved, leaving it solely in vdata once more.

Each unresolved VPID has a decider: either the vat or the kernel. The VPID is resolved by the first of the following events:

* if/when userspace resolves the corresponding `Promise` and liveslots learns of the resolution, then liveslots will perform a `syscall.resolve()`
* if/when the vat is upgraded, liveslots will perform a `syscall.resolve()` of all remaining VPIDs during the delivery of `dispatch.stopVat()` (after which all `Promise`s evaporate along with the rest of the JS heap)
* if/when the vat is terminated, the kernel internally rejects all remaining vat-decided KPIDs, without involving the vat
* otherwise, the VPID remains unresolved until the heat death of the universe

Liveslots tracks promises in the following data structures:

* `slotToVal` / `valToSlot` : these manage *registration*, the mapping from VPID to `Promise` and vice versa. These also register objects (Presences, Remotables, and Representatives) to/from VOIDs, and device nodes.
  * to support GC of objects, `slotToVal.get(vref)` is a WeakRef, and `valToSlot` is a WeakMap
  * liveslots uses independent strong references to maintain object/promise lifetimes
* `exportedVPIDs`: a `Map<VPID, Promise>`: all Promises currently known to the kernel and decided by the vat
* `importedVPIDs`: a `Map<VPID, PromiseKit>`: all Promises currently known to the kernel and decided by the kernel
* `remotableRefCounts`: a `Map<Object|Promise, Number>`: all Promises (and Remotables) referenced by virtual data

The vat-kernel c-list contains all VPIDs in `exportedVPIDs` and `importedVPIDs`. The vat is the decider for `exportedVPIDs`, while the kernel is the decider for `importedVPIDs`. For every VPID in `exportedVPIDs`, we've used `.then` on the `Promise` instance to arrange for a `syscall.resolve` when the promise resolves or rejects. For every VPID key of the `importedVPIDs` Map, the corresponding value is a `[resolve, reject]` "`pRec`", so one of them can be called during `dispatch.notify`. Every VPID in `slotToVal` is either in `exportedVPIDs`, `importedVPIDs`, or neither.

If a VPID in `importedVPIDs` is resolved (by the kernel, via `dispatch.notify`), the VPID is removed from `importedVPIDs`. If a VPID in `exportedVPIDs` is resolved (by the vat, i.e. liveslots observes the previously-added `.then` callback be executed), liveslots invokes `syscall.resolve` and removes the VPID from `exportedVPIDs`. The c-list will not contain VPIDs for any resolved promise.

The `slotToVal`/`valToSlot` registration must remain until 1: the kernel is no longer aware of the VPID, 2: the Promise is not present in any virtual data, and 3: the promise is not being watched by a `promiseWatcher`. If the registration were to be lost while one of those three conditions were still true, a replacement `Promise` might be created while the original was still around, causing confusion.

## Maintaining Strong References

Remember that the `slotToVal` registration uses a WeakRef, so being registered there does not keep the `Promise` object alive.
 
`exportedVPIDs` and `importedVPIDs` keep their `Promise` alive in their value. vdata keeps it alive through the key of `remotableRefCounts`. `promiseWatcher` uses an internal `ScalarBigMapStore` to keep the `Promise` alive.

## Promise/VPID Management Algorithm

* When a `Promise` is first serialized (it appears in `convertValToSlot`), a VPID is assigned and the VPID/`Promise` mapping is registered in `valToSlot`/`slotToVal`
  * at this point, there is not yet a strong reference to the Promise
* When a VPID appears in the serialized arguments of `syscall.send` or `syscall.resolve`:
  * if the VPID already exists in `exportedVPIDs` or `importedVPIDs`: do nothing
  * else: use `followForKernel` to add to `exportedVPIDs` and use `.then()` to attach a `handle` callback
* When `followForKernel`'s `handle` callback is executed:
  * do `syscall.resolve()`
  * remove from `exportedVPIDs`
  * check `remotableRefCounts`. If 0: unregister from `valToSlot`/`slotToVal`
* When the kernel delivers a `dispatch.notify`:
  * retrieve the `resolve`/`reject` "`pRec`" from `importedVPIDs`
  * invoke the appropriate function with the deserialized argument
  * check `remotableRefCounts`. If 0: unregister from `valToSlot`/`slotToVal`
* When the vdata refcount for a VPID drops to zero:
  * if the VPID still exists in `exportedVPIDs` or `importedVPIDs`: do nothing
  * else: unregister from `valToSlot`/`slotToVal`
* When a new VPID is deserialized (it appears in `convertSlotToVal`), this must be the arguments of a delivery (not vdata)
  * use `makePipelinablePromise` to create a HandledPromise for the VPID
  * add the Promise and it's `resolve`/`reject` pair to `importedVPIDs`
  * register the Promise in `valToSlot`/`slotToVal'`
  * use `syscall.subscribe` to request a `dispatch.notify` delivery when the kernel resolves this promise
* When a VPID appears as the `.result` of an outbound `syscall.send`:
  * use `allocateVPID` to allocate a new VPID
  * use `makePipelinablePromise` to create a HandledPromise for the VPID
  * add the Promise and it's `resolve`/`reject` pair to `importedVPIDs`
  * register the Promise in `valToSlot`/`slotToVal'`
  * use `syscall.subscribe` to request a `dispatch.notify` delivery when the kernel resolves this promise
* When a VPID appears as the `.result` of an inbound `dispatch.deliver`:
  * check to see if the VPID is present in `importedVPIDs`:
    * if yes: extract `pRec`, use `pRec.resolve(res)` to forward the invocation result promise to the previously-imported promise, then remove the VPID from `importedVPIDs`
    * if no: register `res` the invocation result promise under the VPID
  * in either case, next we add the VPID to `exportedVPIDs`
  * then we call `followForKernel` to attach a callback to the `res` promise


If the serialization is for storage in virtual data, the act of storing the `VPID` will add the `Promise` to `remotableRefCounts`, which maintains a strong reference for as long as the VPID is held. When it is removed from virtual data (or the object/collection is deleted), the refcount will be decremented. When the refcount drops to zero, we perform the `exportedVPIDs`/`importedVPIDs` check and then maybe unregister the promise.

If the serialization is for the arguments of an outbound `syscall.send` or `syscall.resolve` (or `syscall.callNow`, or `syscall.exit`), the VPID will be added to `exportedVPIDs`.

If the *un*serialization occurred when processing the arguments of an *in*bound `dispatch.deliver` or `dispatch.notify`, the VPID (and the "promise kit" trio of Promise, `resolve`, and `reject`) will be stored in `importedVPIDs`.
