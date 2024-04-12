# The Run Policy

The SwingSet kernel maintains a queue of pending operations to execute: mostly deliveries to vats and promise resolution notifications. This queue may be sizable, and each operation may provoke more work to be added to the list.

SwingSet manages its own prioritization and scheduling for this workload, but it does not get to decide how much work should be done at a time. The host applications breaks this work up into "blocks". We colloquially describe this as the "block size": in the SwingSet context this refers to the number of deliveries ("cranks") performed before declaring the block to be finished, rather than measuring the number of bytes in some host application consensus data structure.

The host is responsible for committing the SwingSet state to durable storage (i.e. `swingstore.commit()`) at the end of a block. Outbound messages are embargoed until after this commit point, to prevent "hangover inconsistency" from revealing state that might still get unwound. Large block sizes are generally more efficient, however 1: they increase latency, because outbound reply messages cannot be delivered until the end of the block, and 2: they increase the likelihood of losing progress because of a crash or other interrupt during the block. Depending upon the application, it may be appropriate to limit blocks to 5-10 seconds of computation.

To impose this limit, the host application has two choices. The first is to call `controller.step()` many times, until the limit is reached. Each invocation performs one delivery to one vat, and returns `true` if there is more work left on the run-queue, or `false` if the queue is empty. Applications could use this method if they want to impose a wallclock limit on the block (keep calling `step()` until 5 seconds have passed or it returns `false`).

But the more sophisticated approach is to call `controller.run(policy)`, with a "Run Policy" object that knows when the block should end. The policy object will get detailed information about each delivery, including the metering results (how many low-level JS engine operations were performed), and can use this to guide the block size.

## Cranks

The kernel maintains two queues. The highest priority queue contains "GC Actions", which are messages to vats that indicate an object has been garbage collected and can now be freed. These are provoked by reference-counting operations that occur as a side-effect of GC syscalls, as well as vat termination events. Each GC Action counts as a "crank", and is reported to the policy object. The policy may end a block while there is still GC Action work to do, in which case the kernel will pick it back up again when the next block begins.

If the GC Action queue is entirely empty, the kernel will look for regular work to do. This consists of the following event types:

* message deliveries to vats (provoked by `syscall.send`, delivered as `dispatch.deliver`)
* promise resolution notifications (provoked by `syscall.resolve`, delivered as `dispatch.notify`)
* vat creation

Each message delivery and resolution notification causes (at most) one vat to execute one "crank" (it might not execute any crank, e.g. when a message is delivered to an unresolved promise, it just gets added to the promise's queue). This crank gives the vat some amount of time to process the delivery, during which it may invoke any number of syscalls. The crank might cause the vat to be terminated, either because of an error, or because it took too much CPU and exceeded its Meter's allowance. Each crank yields a "delivery results object", which indicates the success or failure of the delivery.

When run in a suitable vat worker (`managerType: 'xs-worker'`), the delivery results also include the number of "computrons" consumed, as counted by the JS engine. Computrons are vaguely correlated to CPU cycles (despite being much larger) and thus some correspondence to wallclock time. A Run Policy which wishes to limit wallclock time in a consensus-base manner should pay attention to the cumulative computron count, and end the block after some experimentally-determined limit.

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

The `computrons` argument may be `undefined` (e.g. if the crank was delivered to a non-`xs worker`-based vat, such as the comms vat). The policy should probably treat this as equivalent to some "typical" number of computrons.

`crankFailed` indicates the vat suffered an error during crank delivery, such as a metering fault, memory allocation fault, or fatal syscall. We do not currently have a way to measure the computron usage of failed cranks (many of the error cases are signaled by the worker process exiting with a distinctive status code, which does not give it an opportunity to report back detailed metering data). The run policy should assume the worst.

`emptyCrank` indicates the kernel processed a queued messages which didn't result in a delivery.

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

To protect the system against these bursts, the run policy can be configured to terminate vats slowly. Instead of doing all the cleanup work immediately, the policy allows the kernel to do a little bit of work each time `controller.run()` is called (e.g. once per block, for kernels hosted inside a blockchain).

There are two RunPolicy methods which control this. The first is `runPolicy.allowCleanup()`. This will be invoked many times during `controller.run()`, each time the kernel tries to decide what to do next (once per step). The return value will enable (or not) a fixed amount of cleanup work. The second is `runPolicy.didCleanup({ cleanups })`, which is called later, to inform the policy of how much cleanup work was actually done. The policy can count the cleanups and switch `allowCleanup()` to return `false` when it reaches a threshold. (We need the pre-check `allowCleanup` method because the simple act of looking for cleanup work is itself a cost that we might be able to afford).

If `allowCleanup()` exists, it must either return a falsy value, or an object. This object may have a `budget` property, which must be a number.

A falsy return value (eg `allowCleanup: () => false`) prohibits cleanup work. This can be useful in a "only clean up during idle blocks" approach (see below), but should not be the only policy used, otherwise vat cleanup would never happen.

A numeric `budget` limits how many cleanups are allowed to happen (if any are needed). One "cleanup" will delete one vatstore row, or one c-list entry (note that c-list deletion may trigger GC work), or one heap snapshot record, or one transcript span (and its populated transcript items). Using `{ budget: 5 }` seems to be a reasonable limit on each call, balancing overhead against doing sufficiently small units of work that we can limit the total work performed.

If `budget` is missing or `undefined`, the kernel will perform unlimited cleanup work. This also happens if `allowCleanup()` is missing entirely, which maintains the old behavior for host applications that haven't been updated to make new policy objects. Note that cleanup is higher priority than anything else, followed by GC work, then BringOutYourDead, then message delivery.

`didCleanup({ cleanups })` is called when the kernel actually performed some vat-termination cleanup, and the `cleanups` property is a number with the count of cleanups that took place. Each query to `allowCleanup()` might (or might not) be followed by a call to `didCleanup`, with a `cleanups` value that does not exceed the specified budget.

To limit the work done per block (for blockchain-based applications) the host's RunPolicy objects must keep track of how many cleanups were reported, and change the behavior of `allowCleanup()` when it reaches a per-block threshold. See below for examples.


## Typical Run Policies

A basic policy might simply limit the block to 100 cranks with deliveries and two vat creations:

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

Note that a new policy object should be provided for each call to `run()`.

A more sophisticated one would count computrons. Suppose that experiments suggest that sixty-five million computrons take about 5 seconds to execute. The policy would look like:


```js
function makeComputronCounterPolicy(limit) {
  let total = 0n;
  const policy = harden({
    vatCreated() {
      total += 1_000_000n; // pretend vat creation takes 1M computrons
      return (total < limit);
    },
    crankComplete(details) {
      const { computrons } = details;
      total += computrons;
      return (total < limit);
    },
    crankFailed() {
      total += 65_000_000n; // who knows, 65M is as good as anything
      return (total < limit);
    },
    emptyCrank() {
      return true;
    }
  });
  return policy;
}
```

See `src/runPolicies.js` for examples.

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
        return { budget: cleanups };
      } else {
        return false;
      }
    },
    didCleanup(spent) {
      cleanups -= spent.cleanups;
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

The second only performs cleanup, with a limited budget, stopping the run after any deliveries occur (such as GC actions):

```js
function makeCleanupOnlyPolicy() {
  let cleanups = 5;
  const stop: () => false;
  const policy = harden({
    vatCreated: stop,
    crankComplete: stop,
    crankFailed: stop,
    emptyCrank: stop,
    allowCleanup() {
      if (cleanups > 0) {
        return { budget: cleanups };
      } else {
        return false;
      }
    },
    didCleanup(spent) {
      cleanups -= spent.cleanups;
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

Note that regardless of whatever computron/delivery budget is imposed by the first policy, the second policy will allow one additional delivery to be made (we do not yet have an `allowDelivery()` pre-check method that might inhibit this). The cleanup work, which may or may not happen, will sometimes trigger a GC delivery like `dispatch.dropExports`, but at most one such delivery will be made before the second policy returns `false` and stops `controller.run()`. If cleanup does not trigger such a delivery, or if no cleanup work needs to be done, then one normal run-queue delivery will be performed before the policy has a chance to say "stop". All other cleanup-triggered GC work will be deferred until the first run of the next block.

Also note that `budget` and `cleanups` are plain `Number`s, whereas `comptrons` is a `BigInt`.


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
