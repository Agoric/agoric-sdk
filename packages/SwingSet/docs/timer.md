# Adding a Timer to a new Deployment

There's documentation elsewhere about [how devices fit into the SwingSet
architecture](devices.md). In order to install a Timer device, you first build
a timer object in order to create the timer's endowments, source code, and 
`poll()` function.

## Kernel Configuration

The timer service consists of a device (`device-timer`) and a helper vat (`vat-timer`). The host application must configure the device as it builds the swingset kernel, and then the bootstrap vat must finish the job by wiring the device and vat together.

```
import { buildTimer } from `@agoric/swingset-vat`;
const timer = buildTimer();
```

The `timer` record contains three items: a `srcPath` that points to the timer device source code, an `endowments` which must be provided to the timer device instance, and a `poll` function for use by the host application.

The timer vat is added automatically, but the `config` record must still define the timer device:

```js
config.devices = [
   ...
  timer: { sourceSpec: timer.srcPath },
];
```

and when creating the swingset controller, the `deviceEndowments` record must include the timer's endowments:

```js
const deviceEndowments = {
  timer: { timer.endowments },
};
..
await initializeSwingset(config, [], hostStorage);
const c = await makeSwingsetController(hostStorage, deviceEndowments);
```

## Bootstrap Registration

The timer vat is created automatically, but it must still be wired up. Within your `bootstrap` vat, during the `bootstrap()` call, do the following:

```js
async function bootstrap(vats, devices) {
  const timerService = await E(vats.timer).createTimerService(devices.timer);
  ...
  // use timerService
}
```

The `timerService` Presence returned by `createTimerService` is the API handle from which all timer services are obtained.

## Host Application Invokes poll()

Once the kernel is started, the host application will call `timer.poll(now)` periodically with the current time. This is the device's only way to learn about the passing of time. It remembers the most recent value to satisfy `getCurrentTimestamp()` requests, and it compares `now` against the list of upcoming wakeups and repeating timers to decide if something needs to be scheduled.

This should be called when the kernel is idle (i.e. *not* in the middle of a `controller.run()`), as it will push callback events onto the run-queue. In a consensus machine (blockchain), this is typically called at the beginning of each block's transaction processing phase.

`poll()` will return `true` if any work was pushed onto the queue, or `false` if not. In a non-consensus (solo)  machine, it may be appropriate to skip a `controller.run()` if `poll()` does not report any work being added. In a consensus machine, the return value should be ignored.

Note that `poll()` (and indeed the entire timer service) is agnostic as to what "time" means. You might choose to use seconds, milliseconds, a block height, or any non-decreasing integer. In a blockchain application, you might either use block height, or a consensus-managed block time. In a solo application, the standard unix seconds-since-epoch would be appropriate. The one constraint is that the value is a BigInt that never decreases (`poll(oldTime)` will throw an Error).

A single application might have multiple sources of time, which would require the creation and configuration of multiple timer device+vat pairs.

## Using the Timer Service

The `timerService` object can be distributed to other vats as necessary.

```js
  // for this example, assume poll() provides seconds-since-epoch as a BigInt

  const now = await E(timerService).getCurrentTimestamp();
  
  // simple non-cancellable Promise-based delay
  const p = E(timerService).delay(30); // fires 30 seconds from now
  await p;

  // to cancel wakeups, first build a handler

  const handler = Far('handler', {
    wake(t) { console.log(`woken up at ${t}`); },
  });
  
  // then for one-shot wakeups:
  await E(timerService).setWakeup(startTime, handler);
  // handler.wake(t) will be called shortly after 'startTime'

  // cancel early:
  await E(timerService).removeWakeup(handler);

  // wake up at least 60 seconds from now:
  await E(timerService).setWakeup(now + 60n, handler);


  // makeRepeater() creates a repeating wakeup service: the handler will
  // fire somewhat after 80 seconds from now (delay+interval), and again
  // every 60 seconds thereafter. Individual wakeups might be delayed,
  // but the repeater will not accumulate drift.

  const delay = 20n;
  const interval = 60n;
  const r = E(timerService).makeRepeater(delay, interval);
  E(r).schedule(handler);
  E(r).disable(); // cancel and delete entire repeater
  
  // repeating wakeup service, Notifier-style
  const notifier = E(timerService).makeNotifier(delay, interval);
```
