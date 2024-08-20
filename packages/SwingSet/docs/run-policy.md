# The Run Policy

The SwingSet kernel maintains a queue of pending operations to execute: mostly deliveries to vats and promise resolution notifications. This queue may be sizable, and each operation may provoke more work to be added to the list.

SwingSet manages its own prioritization and scheduling for this workload, but it does not get to decide how much work should be done at a time. The host applications breaks this work up into "blocks". We colloquially describe this as the "block size": in the SwingSet context this refers to the number of deliveries ("cranks") performed before declaring the block to be finished, rather than measuring the number of bytes in some host application consensus data structure.

The host is responsible for committing the SwingSet state to durable storage (i.e. `swingstore.commit()`) at the end of a block. Outbound messages are embargoed until after this commit point, to prevent "hangover inconsistency" from revealing state that might still get unwound. Large block sizes are generally more efficient, however 1: they increase latency, because outbound reply messages cannot be delivered until the end of the block, and 2: they increase the likelihood of losing progress because of a crash or other interrupt during the block. Depending upon the application, it may be appropriate to limit blocks to 5-10 seconds of computation.

To impose this limit, the host application has two choices. The first is to call `controller.step()` many times, until the limit is reached. Each invocation performs one delivery to one vat, and returns `true` if there is more work left on the run-queue, or `false` if the queue is empty. Applications could use this method if they want to impose a wallclock limit on the block (keep calling `step()` until 5 seconds have passed or it returns `false`).

But the more sophisticated approach is to call `controller.run(policy)`, with a "Run Policy" object that knows when the block should end. The policy object will get detailed information about each delivery, including the metering results (how many low-level JS engine operations were performed), and can use this to guide the block size.

## Cranks

The kernel maintains multiple internal action queues. The highest priority is a special "acceptance queue" containing messages to be placed on other queues in a "routing crank" that is reported to the policy without details via `policy.emptyCrank()`. All the other queues contain messages that will prompt a "delivery crank" whose details are reported to the policy object via a different `policy` method. The policy may end a block while one or more queues still contain messages, in which case the kernel will start the next block by trying to drain them in priority order.

The highest priority delivery queue contains "GC Actions", which are messages to vats indicating that an object has been garbage collected and can now be freed. These are provoked by reference-counting operations which occur as a side-effect of GC syscalls and vat termination events.

If the GC Action queue is empty, the kernel will check the "reap queue", which contains vatIDs that need to receive a "bringOutYourDead" delivery.

If the GC Action queue and reap queue are both empty, the kernel will look for regular work to do. This consists of the following event types:

* message deliveries to vats (provoked by `syscall.send`, delivered as `dispatch.deliver`)
* promise resolution notifications (provoked by `syscall.resolve`, delivered as `dispatch.notify`)
* vat creation

Each message delivery and resolution notification causes at most one vat to execute one "crank" (but such vat cranks are not guaranteed, e.g. delivery of a message to an unresolved promise just adds the message to the promise's queue, and delivery of a message to an abandoned object [having no owner vat] goes "splat"). This crank gives the vat some amount of time to process the delivery, during which it may invoke any number of syscalls. The crank might cause the vat to be terminated, either because of an error, or because it took too much CPU and exceeded its Meter's allowance. Each crank yields a "delivery results object", which indicates the success or failure of the delivery.

When run in a suitable vat worker (`managerType: 'xs-worker'`), the delivery results also include the number of "computrons" consumed, as counted by the JS engine. Computrons are vaguely correlated to CPU cycles (despite being much larger) and thus have some correspondence to wallclock time. A Run Policy which wishes to limit wallclock time in a consensus-based manner should pay attention to the cumulative computron count, and end the block after some experimentally-determined limit.

Vat creation also gives a single vat (the brand new one) time to run the top-level forms of its source bundle, as well as the invocation of its `buildRootObject()` method. This typically takes considerably longer than the subsequent messages, and is not currently metered.

## Run Policy

The kernel will invoke the following methods on the policy object (so all must exist, even if they're empty):

* `policy.vatCreated()`
* `policy.crankComplete({ computrons })`
* `policy.crankFailed()`
* `policy.emptyCrank()`

All those methods should return `true` if the kernel should keep running, or `false` if it should stop.

The following methods are optional (for backwards compatibility with policy objects created for older kernels):

* `policy.allowCleanup()` : may return budget, see "Terminated-Vat Cleanup" below
* `policy.didCleanup({ cleanups })` (if missing, kernel pretends it returned `true` to keep running)

The `computrons` value may be `undefined` (e.g. if the crank was delivered to a non-`xs worker`-based vat, such as the comms vat). The policy should probably treat this as equivalent to some "typical" number of computrons.

`crankFailed` indicates that the vat suffered an error during crank delivery, such as a metering fault, memory allocation fault, or fatal syscall. We do not currently have a way to measure the computron usage of failed cranks (many of the error cases are signaled by the worker process exiting with a distinctive status code, which does not give it an opportunity to report back detailed metering data). The run policy should assume the worst.

`emptyCrank` indicates that the kernel processed a queued message which didn't result in a delivery.

More arguments may be added in the future, such as:
* `vatCreated:` the size of the source bundle
* `crankComplete`: the number of syscalls that were made
* `crankComplete`: the aggregate size of the delivery/notification arguments
  * (the first message delivered to each ZCF contract vat contains a very large contract source bundle, and takes considerable time to execute, and this would let the policy treat these cranks accordingly)
* `crankFailed`: the number of computrons consumed before the failure
* `crankFailed`: the nature of the failure (we might be able to distinguish between 1: per-crank metering limit exceeded, 2: allocation limit exceed, 3: fatal syscall, 4: Meter exhausted)

The run policy should be provided as the first argument to `controller.run()`. If omitted, the kernel defaults to `forever`, a policy that runs until the queue is empty.

## Terminated-Vat Cleanup

Some vats may grow very large (i.e. large c-lists with lots of imported/exported objects, or lots of vatstore entries). If/when these are terminated, the burst of cleanup work might overwhelm the kernel, especially when processing all the dropped imports (which trigger GC messages to other vats).

To protect the system against these bursts, the run policy can be configured to terminate vats slowly. Instead of doing all the cleanup work immediately, the policy allows the kernel to do a little bit of work each time `controller.run()` is called (e.g. once per block, for kernels hosted inside a blockchain). Internally, before servicing the run-queue, the kernel checks to see if any vats are in the "terminated but not fully deleted" state, and executes a "vat-cleanup crank", to delete some state. Depending upon what the run-policy allows, it may do multiple vat-cleanup cranks in a single `controller.run()`, or just one, or none at all. And depending upon the budget provided to each one, it may only take one vat-cleanup crank to finish the job, or millions. If the policy limits the number of cranks in a single block, and limits the budget of the crank, then the cleanup process will be spread over multiple blocks.

For each terminated vat, cleanup proceeds through five phases:

* `exports`: delete c-list entries for objects/promises *exported* by the vat
* `imports`: same but for objects/promises *imported* by the vat
* `kv`: delete all other kv entries for this vat, mostly vatstore records
* `snapshots`: delete xsnap heap snapshots, typically one per 200 deliveries (`snapshotInterval`)
* `transcripts`: delete transcript spans, and their associated transcript items

The first two phases, `exports` and `imports`, cause the most activity in other vats. Deleting `exports` can cause objects to be retired, which will deliver `dispatch.retireImports` GC messages to other vats which have imported those objects and used them as keys in a WeakMapStore. Deleting `imports` can cause refcounts to drop to zero, delivering `dispatch.dropImports` into vats which were exporting those objects. Both of these will add `gcKref` "dirt" to the other vat, eventually triggering a BringOutYourDead, which will cause more DB activity. These are generally the phases we must rate-limit to avoid overwhelming the system.

The other phases cause DB activity (deleting rows), but do not interact with other vats, so it is easier to accomodate more cleanup steps. The budget can be tuned to allow more kv/snapshots/transcripts than exports/imports in a single cleanup run.

There are two RunPolicy methods which control this. The first is `runPolicy.allowCleanup()`. This will be invoked many times during `controller.run()`, each time the kernel tries to decide what to do next (once per step). The return value will enable (or not) a fixed amount of cleanup work. The second is `runPolicy.didCleanup({ cleanups })`, which is called later, to inform the policy of how much cleanup work was actually done. The policy can count the cleanups and switch `allowCleanup()` to return `false` when it reaches a threshold. (We need the pre-check `allowCleanup` method because the simple act of looking for cleanup work is itself a cost that we might not be willing to pay).

If `allowCleanup()` exists, it must either return `false`, `true`, or a budget record.

A `false` return value (eg `allowCleanup: () => false`) prohibits all cleanup work. This can be useful in a "only clean up during idle blocks" approach (see below), but should not be the only policy used, otherwise vat cleanup would never happen.

A budget record defines properties to set limits on each phase of cleanup. For example, if `budget.exports = 5`, then each cleanup crank is limited to deleting 5 c-list export records (each of which uses two kv records, one for the kref->vref direction, and another for the vref->kref direction). `budget.transcripts = 10` would allow 10 transcript spans to be deleted, along with all transcript items they referenced (typically 10*200=2000, depending upon `snapshotInterval`).

The limit can be set to `Infinity` to allow unlimited deletion of that particular phase.

Each budget record must include a `{ default }` property, which is used as the default for any phase that is not explicitly mentioned in the budget. This also provides forwards-compatibility for any phases that might be added in the future. So `budget = { default: 5 }` would provide a conservative budget for cleanup, `budget = { default: 5, kv: 50 }` would enable faster deletion of the non-c-list kvstore entries, and `budget = { default: Infinity }` allows unlimited cleanup for all phases.

Note that the cleanup crank ends when no more work is left to be done (which finally allows the vat to be forgotten entirely), or when an individual phase's budget is exceeded. That means multiple phases might see deletion work in a single crank, if the earlier phase finishes its work without exhausting its budget. For example, if the budget is `{ default: 5 }`, but the vat had 4 exports, 4 imports, 4 other kv entries, 4 snapshots, and 4 transcript spans, then all that work would be done in a single crank, because no individual phase would exhaust its budget. The only case that is even worth mentioning is when the end of the `exports` phase overlaps with the start of the `imports` phase, where we might do four more cleanups than usual.

A `true` return value from `allowCleanup()` is equivalent to `{ default: Infinity }`, which allows unlimited cleanup work. This also happens if `allowCleanup()` is missing entirely, which maintains the old behavior for host applications that haven't been updated to make new policy objects. Note that cleanup is higher priority than any delivery, and is second only to acceptance queue routing.

`didCleanup({ cleanups })` is called when the kernel actually performed some vat-termination cleanup, and the `cleanups` property is a "work record" that counts how much cleanup was performed. It contains one number for each phase that did work, plus a `total` property that is the sum of all phases. A cleanup crank which deleted two `exports` and five `imports` would yield a work record of `{ total: 7, exports: 2, imports: 5 }`. The work reported for each phase will not exceed the budget granted to it by `allowCleanup`.

Like other post-run policy methods, `didCleanup` should return `true` if the kernel should keep running or `false` if it should stop.

To limit the work done per block (for blockchain-based applications) the host's RunPolicy objects must keep track of how many cleanups were reported, and change the behavior of `allowCleanup()` when it reaches a per-block threshold. See below for examples.


## Typical Run Policies

A basic policy might simply limit the run/block to 100 cranks with deliveries and two vat creations, and not restrict cleanup at all (so terminated vats are completely deleted in a single step):

```js
function make100CrankPolicy() {
  let cranks = 0;
  let vats = 0;
  const policy = harden({
    vatCreated() {
      vats += 1;
      return (vats < 2);
    },
    crankComplete(details) {
      cranks += 1;
      return (cranks < 100);
    },
    crankFailed() {
      cranks += 1;
      return (cranks < 100);
    },
    emptyCrank() {
      return true;
    },
  });
  return policy;
}
```

and would be supplied like:

```js
while(1) {
  processInboundIO();
  const policy = make100CrankPolicy();
  await controller.run(policy);
  await commit();
  processOutboundIO();
}
```

Note that a new instance of this kind of policy object should be provided in each call to `controller.run()`.

A more sophisticated policy would count computrons, for example based on experimental observations that a 5-second budget is filled by about sixty-five million computrons. The policy would look like:


```js
function makeComputronCounterPolicy(limit) {
  let total = 0n;
  const policy = harden({
    vatCreated() {
      total += 100_000n; // pretend vat creation takes 100k computrons
      return (total < limit);
    },
    crankComplete(details) {
      const { computrons } = details;
      total += computrons;
      return (total < limit);
    },
    crankFailed() {
      total += 1_000_000n; // who knows, 1M is as good as anything
      return (total < limit);
    },
    emptyCrank() {
      return true;
    }
  });
  return policy;
}
```

See [runPolicies.js](../src/lib/runPolicies.js) for examples.

To slowly terminate vats, limiting each block to 5 cleanups, the policy should start with a budget of 5, return the remaining `{ budget }` from `allowCleanup()`, and decrement it as `didCleanup` reports that budget being consumed:

```js
function makeSlowTerminationPolicy() {
  let cranks = 0;
  let vats = 0;
  let cleanups = 5;
  const policy = harden({
    vatCreated() {
      vats += 1;
      return (vats < 2);
    },
    crankComplete(details) {
      cranks += 1;
      return (cranks < 100);
    },
    crankFailed() {
      cranks += 1;
      return (cranks < 100);
    },
    emptyCrank() {
      return true;
    },
    allowCleanup() {
      if (cleanups > 0) {
        return { default: cleanups };
      } else {
        return false;
      }
    },
    didCleanup(details) {
      cleanups -= details.cleanups.total;
      return true;
    },
  });
  return policy;
}
```

A more conservative approach might only allow cleanup in otherwise-empty blocks. To accompish this, use two separate policy objects, and two separate "runs". The first run only performs deliveries, and prohibits all cleanups:

```js
function makeDeliveryOnlyPolicy() {
  let empty = true;
  const didWork = () => { empty = false; return true; };
  const policy = harden({
    vatCreated: didWork,
    crankComplete: didWork,
    crankFailed: didWork,
    emptyCrank: didWork,
    allowCleanup: () => false,
  });
  const wasEmpty = () => empty;
  return [ policy, wasEmpty ];
}
```

The second performs a limited number of cleanups, along with any deliveries (like BOYD) that are caused by the cleanups:

```js
function makeCleanupOnlyPolicy() {
  let cleanups = 5;
  const keepGoing: () => true;
  const policy = harden({
    vatCreated: keepGoing,
    crankComplete: keepGoing,
    crankFailed: keepGoing,
    emptyCrank: keepGoing,
    allowCleanup() {
      if (cleanups > 0) {
        return { default: cleanups };
      } else {
        return false;
      }
    },
    didCleanup(details) {
      cleanups -= details.cleanups.total;
      return true;
    },
  });
  return policy;
}
```

On each block, the host should only perform the second (cleanup) run if the first policy reports that the block was empty:

```js
async function doBlock() {
  const [ firstPolicy, wasEmpty ] = makeDeliveryOnlyPolicy();
  await controller.run(firstPolicy);
  if (wasEmpty()) {
    const secondPolicy = makeCleanupOnlyPolicy();
    await controller.run(secondPolicy);
  }
}
```

The second run, if performed, will both delete some vat records, and deliver any GC actions that result, which may trigger a BringOutYourDead delivery for one or more vats.

Also note that the budget record and cleanups work record property values are plain `Number`s, whereas `comptrons` is a `BigInt`.


## Non-Consensus Wallclock Limits

If the SwingSet kernel is not being operated in consensus mode, then it is safe to use wallclock time as a block limit:

```js
function makeWallclockPolicy(seconds) {
  let timeout = Date.now() + 1000*seconds;
  const policy = harden({
    vatCreated: () => Date.now() < timeout,
    crankComplete: () => Date.now() < timeout,
    crankFailed: () => Date.now() < timeout,
    emptyCrank: () => Date.now() < timeout,
  });
}
```

The kernel does not know (ahead of time) how long the last crank will take, so this will ensure the N-1 initial cranks take less than `seconds` time.

The kernel knows nothing of time, because the kernel is specifically deterministic. If you want to use wallclock time (which is inherently non-deterministic across the separate nodes of a consensus machine), the run policy is responsible for bringing its own source of nondeterminism.
