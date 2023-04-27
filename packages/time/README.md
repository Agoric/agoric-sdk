# Time

"Time is an illusion. Lunchtime doubly so."
  -- Douglas Adams, The Hitchhiker's Guide to the Galaxy

This package provides the definitions of branded time values, as well as "timerMath" functions to compute and combine timestamps and time deltas. It also defines the `TimerService`, a SwingSet service that provides notification when certain amounts of time have elapsed. The service itself is provided by the SwingSet kernel to the bootstrap vat, which might share it with other vat code.

## TimerBrand

In the Agoric platform, "time" is a number (a JS `BigInt`), but is not an absolute: there can be multiple sources of time, and their values are not comparable. A solo machine may have its own local clock ("wallclock time"), but this is different than the "chain time" that the voting members of a consensus machine (i.e. validators on a blockchain) agree upon. Two different chains will have unrelated clocks (they might both attempt to track UTC, but in general they won't track each other precisely, so any decisions about global ordering must involved messages and something like a Lamport Clock protocol).

We must avoid confusion, in particular we must avoid security vulnerabilities that arise when two parties think they've agreed upon an e.g. contract expiration time, but it turns out they were speaking about different units. To this end, each timestamp is associated with a "TimerBrand". The timerMath functions refuse to mingle differently-branded time values.

The TimerBrand is a powerless object, mainly used for its identity: you can compare two TimerBrands from different sources, and if they are equal, those sources are using compatible time values.

The TimerBrand object has two methods to support comparison:

* `timerbrand.isMyTimer(timerService)` returns `true` if the TimerService matches the brand
* `timerbrand.isMyClock(clock)` returns `true` if the Clock matches the brand

## Absolute Time and Deltas

The `Timestamp` is a record which describes a specific moment in time (along with its brand). Given two Timestamps with the same brand, you can ask about equality and inequality ("which one happened first?").

You can also subtract one from the other to obtain a `RelativeTime` record. These deltas can be positive or negative. Then you can add a `Timestamp` and a `RelativeTime` to get a new `Timestamp`. Deltas can also be multiplied by a `BigInt` to replace repeated addition, and divided in certain circumstances.

The functions in `timeMath.js` describe the full range of things you can do with `Timestamp` and `RelativeTime` records.

## Clocks

A `Clock` is a read-only service that provides the "current" time. It is an object with two methods:

* `getCurrentTimestamp() => Timestamp`
* `getTimerBrand() => TimerBrand`

## TimerService

The `TimerService` is a service that allows one-shot or repeating "alarms" to be set. These can trigger user code at some point in the future.

This package defines the `TimerService` interfaces, but does not implement them. Time (specifically the ability to learn the current time, and to arrange for activity in the future) is a special IO authority, and must come from the host platform. The SwingSet kernel creates a "timer vat", and the host application must call special functions to teach it about the passage of time. Userspace code can only access `TimerService` if the bootstrap vat chooses to share access to this object.

The `TimerService` API provides three "one-shot" mechanisms:

* `ts.setWakeup(when, waker, cancelToken?)` : calls `E(waker).wake(when)` upon triggering
* `ts.wakeAt(when, cancelToken?)` : returns a Promise that resolves with `when` upon triggering
* `ts.delay(delay, cancelToken?)` : returns a Promise that resolves with `now+when` at `now` units in the future

The optionsl `cancelToken` argument is an arbitrary remotely-referenceable object. If provided, a subsequent call to `ts.cancel(cancelToken)` will abandon the wakeup (unless it has fired already, in which case `ts.cancel()` is silently ignored). The waker is not notified of cancellation, but the APIs which use Promises will see those Promises rejected with an `Error('TimerCancelled')`.

The API also provides three repeating mechanisms:

* `ts.makeRepeater(delay, interval, cancelToken?)` returns a `TimerRepeater` configured to fire at `now+delay`, and then again at `now+delay+interval`, etc
  * to use it, you must call `repeater.schedule(waker)`, which will be called just like `ts.setWakeup)`
  * the repeater doesn't reset until the waker's `wake()` method's return promise resolves
  * if that method throws an Error, the repeater is cancelled
  * you can call `repeater.disable()` to stop the repeater
  * each repeater can only have one active waker
* `ts.repeatAfter(delay, interval, handler, cancelToken?)` takes a warker as the `handler` argument directly, which removes the need to call `.schedule`
* `ts.makeNotifier(delay, interval, cancelToken?)` returns a Notifier, which fires with successive Timestamp values (`now+delay`, `now+delay+interval`, `now+delay+2*interval`, etc). As with all Notifiers, the subscriber must repeatedly call `getUpdateSince()` to keep getting new values.

The `TimerService` API also provides `getClock()` to retrieve a limited-authority `Clock`, and `getTimerBrand()` to return the particular brand that this service uses for all Timestamps. It also provides `getCurrentTimestamp()` directly.
