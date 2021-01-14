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

In `bootstrap()` for a particular SwingSet, we create a timerService, and
make it accessible to the user in `home`

```
const timerService = vats.timerWrapper~.createTimerService(devices.timer);
```

Then users in the REPL can use the timerService to schedule wakeups.

```
const timestampP = timerService~.getCurrentTimestamp();

const handler = harden({wake(now) { console.log(`woke up ${now}`); }});
const willWakeAt = timerService~.setWakeup(60, handler);
```

The handler will fire somewhat after 60 seconds from now.

```
const repeater = timerService~.makeRepeater(20, 60);
repeater~.schedule(handler);
```

The handler will fire in somewhat after 80 seconds from now, and every 60
seconds thereafter. Calling `repeater~.disable()` will cancel prevent the repeater
from scheduling future activations
