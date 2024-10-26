# The Host Application

SwingSet is a library that helps you write a "Host Application" around a kernel, which in turn manages some number of vats and devices. The Host Application does not come with SwingSet: you must write one specific to your particular application.

## Host Application Responsibilities

### State Management

First, the host app is responsible for managing the kernel's state in a "SwingStore", using the `@agoric/swing-store` package, which is a SQLite database in some user-selected base directory, wrapped in useful APIs. A SwingStore is created by the `@agoric/swing-store` package, and consists of both a `hostStorage` facet and a `kernelStorage` facet. The `kernelStorage` facet must be given to `makeSwingsetController()`, the primary API for creating a kernel. All kernel state is kept inside the SwingStore.

The host app must use `hostStorage.commit()` to commit the SwingStore changes after each group of device inputs and cranks (usually triggered with one or more calls to `controller.run()`). The host must not commit while the run is execution: it must wait for the `controller.run()` return Promise to settle first.

### Device IO

The host app is also responsible for all device input and output. The kernel itself cannot talk to the outside world, except through devices. These devices are configured with the kernel config record (along with static vats), but the device *endowments* are provided by the host app via the `deviceEndowments` argument to `makeSwingsetController()`.

SwingSet provides robust and deterministic computation, even in the face of unexpected reboot, and avoids a failure mode called "hangover inconsistency" by following the lead of the Waterken and E systems. Output messages (in fact all communication with the outside world) must be embargoed until all consequences of an inbound delivery have been durably committed. To maintain this, device endowments must refrain from transmitting their outputs or modifying state outside of the DB until after the host app calls `hostStorage.commit()`, and they must be prepared to re-transmit their outputs or re-apply their effects if they awaken into a world where the durable state says that a message must be transmitted but no record of an acknowledgment is also recorded. See the comms subsystem, especially the "mailbox" device, for more details.

### Kernel Upgrade

The life cycle of a SwingSet kernel begins with the one and only call to `initializeSwingset()`, which populates the SwingStore DB for the first time. After that, the kernel is presumed to be immortal, but its execution is broken up into a series of reboots. Each reboot (e.g. each time the host application is started), the app must build a new controller with `makeSwingsetController()`, to have something to run.

From time to time, the host app will be upgraded to use a newer version of the SwingSet kernel code (e.g. a new version of this `@agoric/swingset-vat` package). The newer version might require an upgrade to the kernel's persisted/durable state. For example, the way it represents some vat metadata might be made more efficient, and the upgrade process needs to examine and rewrite vat state to use the new representation. Or, a bug might be fixed, and the upgrade process needs to locate and remediate any consequences of the bug having been present during earlier execution.

To make the resulting state changes occur deterministically, upgrades are not automatic. Instead, each time the host app reboots with a new version of the kernel code, it must call `upgradeSwingset(kernelStorage)`. It must do this *before* calling `makeSwingsetController()`, as that function will throw an error if given a SwingStore that has not been upgraded.

It is safe to call `upgradeSwingset` on reboots that do not change the version of the kernel code: the function is idempotent, and will do nothing if the SwingStore is already up-to-date.

Some upgrades (in particular bug remediations) need to add events to the kernel's run-queue. To avoid having these events be intermingled with work that might already be on the run-queue at reboot time (e.g. work leftover from previous runs), these events are not automatically injected at that time. Instead, the kernel remembers what needs to be done, and waits for the host to invoke `controller.injectQueuedUpgradeEvents()` at a time of their choosing. This should be done before the next `commit()`, to avoid the risk of them being lost by a reboot.

So most host applications will start each reboot with a sequence like this:

```js
const { hostStorage, kernelStorage } = openSwingStore(baseDirectory);
upgradeSwingset(kernelStorage);
const controller = makeSwingsetController(kernelStorage, deviceEndowments);
controller.injectQueuedUpgradeEvents();
```

followed by later code to execute runs. Inputs can be fed all-at-once, or each processed in their own run, but at the end of the block, the host app must `commit()` the DB:

```js
async function doBlock(deviceInputs) {
  for (const input of deviceInputs) {
    injectDeviceInput(input);
    await controller.run();
  }
  hostStorage.commit();
  emitDeviceOutputs();
}
```

The actual signature of `upgradeSwingset` is `const { modified } = upgradeSwingset(kernelStorage)`, and the `modified` flag indicates whether anything actually got upgraded. Host applications which have other means to keep track of software upgrades may wish to assert that `modified === false` in reboots that are not associated with a change to the kernel package version. They can also safely skip the `injectQueuedUpgradeEvents` call if nothing was modified.

### Crank Execution

For convenience in discussion, we split execution into "blocks". During a block, the host may call one or more device inputs, such as inbound messages, or timer wakeup events. The end of the block is marked by one or more calls to `controller.run()`, followed by a `hostStorage.commit()`, followed by the host-provided device endowments doing whatever kind of outbound IO they need to do.

In a replicated/blockchain host environment, these are the same blocks that make up the chain. Inbound messages come from the signed transactions that are included in each block. And each block can inform the timer device that time has advanced to whatever consensus time is computed as part of the blockchain voting process. "Outbound IO" is really just recording data in the chain state, where external parties can retrieve it and verify it against the block header and its hash.

In a singular/solo environment, "block boundaries" are simply points in time when the host app decides it would be useful to perform computation, commit state, and release outbound messages. These "blocks" are triggered by inbound IO requests, or timer wakeup events. The host might choose to trigger a "block" immediately after each such event (to minimize latency), or it might defer execution for a little while to batch them together (for efficiency).
