# C-Lists

SwingSet, like many capability-based systems, uses Capability Lists ("c-lists") to both translate access rights from one domain to another, and to limit those rights to previously-granted objects.

The SwingSet kernel supports a number of vats, in a star configuration. At the boundary between the vat and each kernel, the kernel hosts a c-list table, which maps the kernel-side reference strings ("krefs") to their vat-side counterparts ("vrefs").

| vatID:  v4      |
| kref | vref     |
| ---- | ------   |
| ko12 | o+0      |
| ko13 | o+d5/1   |
| ko14 | o+v6/1   |
| ko15 | o+v7/1:0 |
| ko16 | o-4      |
| kp7  | p+3      |
| kp8  | p-3      |
| kd4  | d-4      |

The c-list is currently stored as `kvStore` entries in the kernel's swing-store DB. Each c-list entry gets two kvStore keys, one for each direction. The kref-to-vref mapping gets a key of `${vatID}.c.${kref}`, while the vref-to-kref mapping gets `${vatID}.c.${vref}`. The value is the vref or kref, respectively. (The c-list is also used to track the reachable/recognizable status of the vat's import, so the krev-to-vref direction has additional flag characters in its value).

Object krefs (`koNN`) point into the kernel object table. Each such object is exported by exactly one vat, and might be imported by one or more other vats.

Promise krefs (`kpNN`) also have a kernel table. Each unresolved promise has a "decider", who has the authority to resolve it to some value, or reject it with some error data. Unresolved promises also have subscribers (who will be notified when it settles), and a queue of messages (which will be delivered to the eventual resolution). Resolved promises have resolution/rejection data.

Device krefs (`kdNN`) refer to device nodes, which are exported by exactly one device, and can be imported by vats. (Devices are managed very much like vats, and they have their own c-lists. Only devices can export device nodes, and vats can only import them).

Each time the kernel sends a message into the vat, the kernel translates the message krefs through the c-list into vrefs. This may cause new "vat imports" to be allocated, adding new entries to the c-list.

Each time the vat sends a message into the kernel, the kernel is also responsible for translating the message vrefs into krefs. This may cause new "vat exports" to be allocated, adding new entries to the c-list.

The kernel owns the c-lists: vats cannot read the contents, nor directly modify them (only vat exports cause vat-supplied data to be added). Vats never learn krefs.

## kref Formats

Kernel-side krefs are always one of:

* `koNN` : objects
* `kpNN` : promises
* `kdNN` : device nodes

## vref Formats

Vat-side vrefs always start with a type and which-side-allocated-it prefix:

* `o+` : vat-allocated objects
* `o-` : kernel-allocated objects
* `p+` : vat-allocated promises
* `p-` : kernel-allocated promises
* `d+` : device-allocated device nodes (note: only devices can export device nodes, not vats)
* `d-` : kernel-allocated device nodes

The suffix of a kernel-allocated vref will just be a numeric identifier: `o-NN`, `p-NN`, and `d-NN`.

Vat-allocated vrefs are allowed more flexibility in their suffix. The kernel asserts a particular shape with `parseVatSlot()`, but this is meant for catching mistakes, and we expect `parseVatSlot` to become more lenient over time. In particular, liveslots-based vats create virtual-object vrefs with a multi-part `o+TKK/II:FF` format, to track the `T` ephemeral/virtual/durable status, the `KK` Kind ID, the `II` instance ID, and the `FF` facet ID.

As a result, the kernel generally does not examine exported vrefs too carefully. The one constraint is that the kernel is allowed to examine the virtual-vs-durable status, so it can delete non-durable c-list entries when a vat is upgraded.

## Vat Imports

When the kernel sends a new object reference into the vat, the vat is said to "import" this reference. The kernel will allocate a new `o-NN` vref, and populate the vat's c-list with the kref/vref pair. All negative index values are imports, and allocation is owned by the kernel (which manages a counter to keep them distinct). All positive index values are allocated by the vat, so they will never conflict with the kernel's allocations.

krefs can appear in `dispatch.deliver` deliveries (which send object messages into a vat), or `dispatch.notify` (which inform the vat about the resolution or rejection of a promise they have subscribed to). They can also appear in GC-related deliveries like `dispatch.dropExports`, `dispatch.retireExports`, and `dispatch.retireImports`, where they reference an object that is no longer reachable or recognizable.

## Vat Exports

When a vat sends an outbound message with `syscall.send` (or resolves a promise with `syscall.resolve`), it can include both pre-existing object vrefs, and new ones. The new ones must always start with `o+`, to distinguish them from imports. Vats cannot just make up `o-` entries: if the kernel has not granted the vat access to a particular `koNN` kernel object, the kref will not already be present in the c-list, and the vat cannot emit any vref that will translate into that kref. Access is only acquired through inbound deliveries that include the new reference.
