# Adding a Timer to a new Deployment

There's documentation elsewhere about [how devices fit into the SwingSet
architecture](devices.md). In order to install a Timer device, you first build
a timer object in order to create the timer's endowments, source code, and 
`poll()` function.

```
import { buildTimer, getTimerWrapperSourcePath } from `@agoric/swingset-vat`;
const timer = buildTimer();
```

Then when configuring devices, the timer device can be added:

```
config.devices = [
   ...
  ['timer', timer.srcPath, timer.endowments],
];
```
    
and the Timer vat set up: 
```
config.vats.set('timer', { sourcepath: getTimerWrapperSourcePath() });
```

The `t.poll(now)` must be called periodically (usually at Block start time)
with the current time. When `poll()` returns true, the kernel has work to do, 
and we must call `controller.run()` and manage any resulting state updates.

The "wrapper" vat has to provide a function to allow registering the device
and creating the service. The vat is responsible for creating repeater objects
to wrap the device node as a capability that can be accessed by regular vat
code.

In `bootstrap()` for a particular SwingSet, we create a timerService, and make
it accessible to the user in `home.localTimerService` (whose timestamps are
measured in milliseconds).

```
const timerService = E(vats.timerWrapper).createTimerService(devices.timer);
```

Then users in the REPL can use the `localTimerService` (in milliseconds since
the epoch) or `chainTimerService` (in seconds since the epoch) to schedule wakeups.

There is a simple promise-based `delay` function that resolves its returned promise
when at least its first `delay` argument has passed.

```js
E(home.localTimerService).delay(60_000n);
```

This promise will resolve to the current timestamp after 60 seconds from now.

Alteratively, if you wish to be able to cancel the delay, you can use the more
powerful `setWakeup` method:

```js
timestamp = E(home.localTimerService).getCurrentTimestamp();

handler = Far('waker', { wake(now) { console.log(`woke up ${now}`); } });
willWakeAt = E(home.localTimerService).setWakeup(timestamp + 60_000n, handler);
```

The handler will fire somewhat after 60 seconds from now.

```js
repeater = E(home.localTimerService).makeRepeater(20_000n, 60_000n);
E(repeater).schedule(handler);
```

The handler will fire in somewhat after 80 seconds from now, and every 60
seconds thereafter. Calling `E(repeater).disable()` will cancel the repeater and
prevent it from scheduling future activations
