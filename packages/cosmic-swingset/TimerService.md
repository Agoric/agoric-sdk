There will be one or two timerServices in home. One is from the chain (if
present), the other from the local vat. It would probably be sensible to use a
chain-based timer for contracts, but more efficient to use the local timer
for operations that don't need consensus or consistency. Each timerService
gives the ability to get the current time, schedule a single wake() call,
create a repeater that will allow scheduling of events at regular intervals,
or remove scheduled calls.

The timerService's API is 

```
interface TimerService {
  // Retrieve the time of the start of the current block.
  getCurrentTimestamp() -> (integer);

  // Return value is the time at which the call is scheduled to take place.
  setWakeup(baseTime :integer, handler :Handler) -> (integer);

  // Remove the handler from all its scheduled wakeups, whether
  // produced by timer.setWakeup(h) or repeater.schedule(h).
  removeWakeup(handler :Handler) -> (List(integer));

  // Create and return a repeater that will schedule wake() calls repeatedly at
  // times that are a multiple of interval following baseTime. Interval is the
  // delay between successive times at which wake will be called. When
  // schedule(h) is called, h.wake() will be scheduled to be called after the
  // next multiple of interval from the base. Since block times are coarse-
  // grained, the actual call may occur later, but this won't change when the
  // next event will be called. 
  makeRepeater(delaySecs :integer, interval :integer) -> (Repeater);
}

interface Repeater {
  // Return value is the time scheduled for the first call on handler.
  // The handler will continue to be scheduled for a wake() call every
  // interval until the repeater is disabled.
  schedule(handler :Handler) -> (integer);

  // Disable this repeater, so schedule() can't be called, and handlers
  // already scheduled with this repeater won't be rescheduled again after
  // wake() is next called on them.
  disable();
}

interface Handler {
  // The time passed to wake() is the time that the call was scheduled to
  // occur.
  wake(time);
}
```

Here's a transcript of a session showing the use of the repeater.

```
command[0]  home
history[0]  {"LOADING":[Promise],"gallery":[Presence o-50],"sharingService":[Presence o-51],
"purse":[Presence o-52],"canvasStatePublisher":[Presence o-53],"contractHost":[Presence o-54],
"chainTimerService":[Presence o-55],"sharing":[Presence o-56],"registry":[Presence o-57],"zoe":
[Presence o-58],"localTimerService":[Presence o-59],"uploads":[Presence o-60]}
command[1]  home.localTimerService~.getCurrentTimestamp()
history[1]  1571782780000
command[2]  home.chainTimerService~.getCurrentTimestamp()
history[2]  1571782793
command[3]  makeHandler = () => { let calls = 0; const args = []; return { getCalls() {
return calls; }, getArgs() { return args; }, wake(arg) { args.push(arg); calls += 1; }, }; }
history[3]  [Function makeHandler]
command[4]  h1 = makeHandler()
history[4]  {"getCalls":[Function getCalls],"getArgs":[Function getArgs],"wake":[Function wake]}
command[5]  h2 = makeHandler()
history[5]  {"getCalls":[Function getCalls],"getArgs":[Function getArgs],"wake":[Function wake]}
command[6]  tl = home.localTimerService
history[6]  [Presence o-59]  
command[7]  tc = home.chainTimerService
history[7]  [Presence o-55]  
command[8]  rl = tl~.makeRepeater(7, 1500)
history[8]  [Presence o-64]  
command[9]  rc = tc~.makeRepeater(7, 1)
history[9]  [Presence o-65]  
command[10]  rl~.schedule(h1)
history[10]  1571783040007
command[11]  rc~.schedule(h2)
history[11]  1571783051
command[12]  h1.getCalls()
history[12]  3
command[13]  h2.getCalls()
history[13]  1
...
command[22]  h1.getCalls()
history[22]  50
command[23]  h1.getCalls()
history[23]  53
command[24]  h1.getCalls()
history[24]  54
command[25]  tl~.getCurrentTimestamp()
history[25]  1571783375000
command[26]  tc~.getCurrentTimestamp()
history[26]  1571783384
```
