## Running the benchmark for vault creation

To run the vault open benchmark:

`# cd packages/benchmark/benchmark`

`# tsx benchmark-vault-open.js --local --slog slog --output stats.json --rounds 3 >& log`

(`tsx` invokes NodeJS with the necessary voodoo to enable it to execute
TypeScript code; it's necessary because the benchmark tooling relies on some
testing code in our source tree that is written in TypeScript.  If you don't
already have `tsx` you can install it from npm.)

`--local` runs using "local" workers (i.e., everything within a single Node
process).  This is not the most realistic environment, but it's realistic enough
for our purposes here, and it runs the fastest (which is important right now
because we expect to be doing this a lot).  Note that on the first run, the
bundle cache may be empty, so the run time may be annoyingly longer than normal
as it creates all the various code bundles, but successive runs will mostly use
the cache and will be considerably quicker.

`--slog slog` gives us a slog file (in this case named "slog") as output, which
we'll analyze to try to understand what the heck the operation is doing.

`--output stats.json` gives us a JSON file (in this case names "stats.json")
containing all the performance data collected during the benchmark run.  There
will be a terser, more human readable version of this in the console output, but
this data lets us do a more detailed analysis using tools like `jq` to extract
specific things.

`--rounds 3` tells it to run three rounds of the benchmark.  The benchmarking
framework will run however many repetitions of the actual benchmark you tell it;
higher numbers of rounds are useful if there are meaningful statistical
variations between rounds or if the round itself is so short that you want to
get lots of samples.  In many cases, though, a single round is sufficient; so if
you don't specify the number of rounds on the command line, the default is 1.
For exercising the vault open operation, one round is probably fine, but we're
going to use three rounds in the example here just to illustrate how it affects
the output.

(You can also issue a terser form of the same command, which some people prefer
because they like terseness:

`# tsx benchmark-vault-open.js -l -s slog -o stats.json -r 3 >& log`

Also, the command:

`# tsx benchmark-vault-open.js --help`

will give you a summary of all the various command line options.  Note that all
benchmarks built with the Benchmarkerator tool have the same command line
interface.)

## Benchmark outputs

Executing the benchmark according to the above recipe leaves us with three
output artifacts: the console log (`log`), the slog file (`slog`), and the
performance data (`stats.json`).

Each of these artifacts tells us different things.

### Console log

The console log contains any incidental output that the run generated, which can
be nothing or can be quite a lot depending on the test that you ran, but it also
contains a pair of nicely formatted, human readable summary reports of the
benchmark stats.  The first such report shows stats from the setup phase
(wherein all the various vats that make up the chain get deployed and establish
their various relationships with each other), while the second shows stats from
the benchmark round or rounds themselves (i.e., the exercise of the actual
operation that we're interested in improving the performance of).  Normally it
is only the latter stats that are of interest, but the setup stats can be useful
if you are interested in what the overall chain is doing (in which case you
probably aren't focusing on any particular benchmark, as they're all share
essentially the same setup execution).

In the example here, looking into the console log we find the setup report:

```
----------------------------------------------------------------------
Setup stats:
7215 cranks in 31667933958ns (4389180.036/crank)
Stat                                 Value      Incs      Decs  MaxValue  PerCrank
--------------------------------  --------  --------  --------  --------  --------
syscalls                             61106                                   8.469
syscallSend                           1744                                   0.242
syscallCallNow                         421                                   0.058
syscallSubscribe                      1769                                   0.245
syscallResolve                        1759                                   0.244
syscallExit                              1                                   0
syscallVatstoreGet                   30559                                   4.235
syscallVatstoreSet                   22645                                   3.139
syscallVatstoreGetNextKey             1936                                   0.268
syscallVatstoreDelete                  272                                   0.038
syscallDropImports                       0                                   0
dispatches                            3443                                   0.477
dispatchDeliver                       1744                                   0.242
dispatchNotify                        1698                                   0.235
kernelObjects                          812       815         3       812     0.113
kernelDevices                           33        33         0        33     0.005
kernelPromises                          72      1846      1774       200     0.010
kpUnresolved                            69      1846      1777       192     0.010
kpFulfilled                              3      1777      1774        64     0
kpRejected                               0         0         0         0     0
clistEntries                          2924      6434      3510      2929     0.405
vats                                    51        51         0        51     0.007
runQueueLength                           0      3494      3494        70     0
acceptanceQueueLength                    0      3717      3717        21     0
promiseQueuesLength                      0       223       223        26     0
----------------------------------------------------------------------
```
This will be embedded somewhere in the middle of the log, so you might need to
resort to a text editor to extract it (just look for the "Setup stats:"
string).  However, normally you don't need this information.

The benchmark rounds report, on the other hand, *is* generally of interest, but
it's always at the end of the console log.  In our example it looks like this:
```
----------------------------------------------------------------------
Benchmark "open vault" stats:
811 cranks over 3 rounds (270.333 cranks/round)
811 cranks in 803354957ns (990573.313/crank})
3 rounds in 803354957ns (267784985.667/round})

Counter                           Delta   PerRound
--------------------------------  -----  ---------
syscalls                           5673   1891
syscallSend                         193     64.333
syscallCallNow                       38     12.667
syscallSubscribe                    205     68.333
syscallResolve                      205     68.333
syscallExit                           0      0
syscallVatstoreGet                 3339   1113
syscallVatstoreSet                 1385    461.667
syscallVatstoreGetNextKey            87     29
syscallVatstoreDelete               221     73.667
syscallDropImports                    0      0
dispatches                          398    132.667
dispatchDeliver                     193     64.333
dispatchNotify                      205     68.333

Gauge                             Start    End  Delta  PerRound
--------------------------------  -----  -----  -----  --------
kernelObjects                       812    871     59    19.667
kernelDevices                        33     33      0     0
kernelPromises                       72     72      0     0
kpUnresolved                         69     69      0     0
kpFulfilled                           3      3      0     0
kpRejected                            0      0      0     0
clistEntries                       2924   3081    157    52.333
vats                                 51     51      0     0
runQueueLength                        0      0      0     0
acceptanceQueueLength                 0      0      0     0
promiseQueuesLength                   0      0      0     0
----------------------------------------------------------------------
```

The top portion summarizes what happened: 3 rounds, averaging 270.333 cranks
each.  The fractional number of cranks means that the rounds were not of uniform
length.  This is not unusual.  Such non-uniformity can be caused a number of
different ways.  Among these are lazy initialization (which typically happens
just once, and so will only show up in whatever round -- often the first --
triggered it), behavior variations resulting from timer-driven events (though
execution is deterministic, the chain still has a consensus notion of time
derived from block height and the benchmark framework emulates this), and
garbage collection (since the triggering of GC is generally a function of the
cumulative amount of execution activity).  There can also be variations that
result from the normal evolution of the chain state as multiple operations
progress, though if possible you should strive to write benchmarks to minimize
this kind of variation as it makes diagnosis of performance issues tricker.
We'll piece together what caused this non-uniformity when we look more closely
at the slog data below, just so we can understand exactly what's going on
(because for pedagogical purposes we're being fussy and perhaps excessively
detail oriented), but note that unless the discrepancies are large, from a
performance analysis perspective it's usually unlikely to be worth the effort to
precisely account for them.

Also shown in the summary is the execution time, measured in nanoseconds
(nanoseconds are the units we get the raw timing numbers in; in a future
iteration of this tooling we may choose to present the output in more user
friendly units).  The report shows both the measured cumulative execution time
and the computed average per round.  The latter is the primary, bottom line
performance number that we're ultimately seeking to reduce.  Tracking this
number as you make (hopefully performance improving) interventions in the code
is how you tell whether you are succeeding or not; all the other data we'll be
talking about in this document are diagnostics that may provide clues as to
where the execution time is being spent and consequently what interventions
might prove effective.

In the current example we see that each round is averaging around 268ms.  Since
each round represents a single vault open operation, we can conclude that it
takes us slightly more than a quarter second to open a vault, though there's an
important caveat here that pertains to almost any kind of performance timing
activity of this sort.  The numbers you see are the numbers I got from running
the benchmark on my own development machine.  If you try this in your own
environment, you'll almost certainly get somewhat different numbers.  Other
machines, such as those run by validators or test net hosts running in the
cloud, will also mostly likely show different timing values.  The key thing to
pay attention to is not so much the absolute magnitude of the bottom-line number
as how it varies in response to changes you make in the code.  The expectation
is that other hosts, even though they might have very different timing numbers,
will experience roughly proportional performance changes in response to those
same code changes (there are some additional, reasonably important
qualifications to that as well, but they're out of the scope of what I'm trying
to cover here).

The remaining information in the report consists of metrics reported by the
SwingSet kernel.  Unlike the timing numbers, these numbers are the product of
deterministic computation and absolutely should not vary from run to run or from
machine to machine as long as the code being measured is the same.  There are
two kinds of numbers here, counters and gauges.  Counters are simple counts of
things that happened, while gauges reflect amounts of resource usage that can
fluctuate up and down over time.

The counters count syscalls and dispatches.  Syscalls are calls from vats into
the kernel for services, while dispatches are events the kernel delivers into
vats for processing.  Both kinds of counts are also broken down by type.  In
particular, dispatches are categorized as deliveries or notifications.
Deliveries inform a vat about a message from another vat, while notifications
inform a vat about the resolution or rejection of an imported promise.  You'll
note that the total number of dispatches is slighlty less than half the number
of cranks.  Each dispatch gets counted twice, since each event gets handled by
two cranks: the first time for routing and then a second, later time for actual
dispatch into a vat.  (The number isn't exactly half the number of cranks
because there are a few kinds of relatively infrequent dispatches that aren't
counted.  These have to do with overhead operations like garbage collection and
the like.  It's actually a minor bug that these aren't counted and there's an
open issue to fix this, but the discrepancy is not terribly important if your
mission is performance engineering.)

The gauges measure the numbers of different memory consuming things the kernel
is holding onto.  The most important column to look at is the rightmost, which
shows the average change in value per round.  Pay particular attention to values
which are positive -- note here, for example, all the values are 0 except two.
If this number is positive, it does not necessarily mean there's a problem, but
it *is* something that needs to be understood.  Depending on what the operation
being measured is doing, growing resource usage over time might indicate a
storage leak. On the other hand, it might also mean that things are working
correctly, if the job of the code in question is to create something long
lived. In the current example, opening a vault creates a vault, which will stick
around, so it's reasonable for the number of kernel objects and C-list entries
to go up each time; whether that normal behavior accounts for all of the delta
is still an open question, however.

In addition to the performance data reports, there are a few other lines in the
console log that bear paying attention to.  The benchmark tool outputs lines at
the start and end of each benchmark round that let you know what the crank
number bounds for that round are and allow you to scope other random console
output according to whether it was part of the setup phase or part of some
round, and if the latter which round it was part of.  If you look at the console
log from the example, right after the performance metrics report for the setup
phase, you'll see the lines:

```
----------------------------------------------------------------------
Benchmark "open vault" round 1 start crank 7215
```
followed some time later by:
```
Benchmark "open vault" round 1 end crank 7495
----------------------------------------------------------------------
Benchmark "open vault" round 2 start crank 7496
```
and then
```
Benchmark "open vault" round 2 end crank 7760
----------------------------------------------------------------------
Benchmark "open vault" round 3 start crank 7761
```
and finally
```
Benchmark "open vault" round 3 end crank 8025
----------------------------------------------------------------------
```

These lines tell us that round 1 was cranks 7215 to 7495, round 2 was cranks
7496 to 7760, and round 3 was cranks 7761 to 8025.  These crank numbers will be
important when examining the slog file, which we'll get to below.

Note that in this example the first crank of each round immediately follows the
last crank of the previous round, but this may not be the case if the benchmark
defines per-round setup or finish functions.  However, the vault open benchmark
we're using here doesn't have those.

In addition, if the benchmark itself has a setup function defined, you will see
the execution preceded by

```
Benchmark "${title}" setup:
```
followed by any console messages generated during the execution of the setup
function, if any.  A similar message for finishing activity will follow all the
rounds if the benchmark has a finish function defined.

The example we're looking at here employs neither setup nor finish functions, so
instead you'll see:
```
Benchmark "open vault" no setup function configured
```
and
```
Benchmark "open vault" no finish function configured
```

### Stats file

The performance stats data file (in this case `stats.json`) contains essentially
the same information as the summary reports in the console log, except in
machine readable form.  The notable thing that the machine readable data
contains that the summary report does not is a separate stats record for each
round.  If you're working along with this example at home, it's worth perusing
the file to get a sense of what's in there, but we won't be making use of it
here directly (and you can get away with leaving off the `-o` or `--output`
option henceforth).  The intended use case for this data is CI tools that track
performance change over time as the code evolves, rather than diagnosing
specific performance issues, but it's possible that more complex diagnostic
cases might benefit from the per-round data, so it's good for you to know that
it's there if you need it.

### Slog file

The final benchmark output artifact is the slog file.  This is a file of JSON
lines output by the SwingSet kernel, logging -- in considerable detail --
everything that it does.  You'll note that it's very long, and if you look at it
in a text editor you'll see that it's very detailed and busy, and rather
difficult to parse visually.  But it's not really intended to be viewed
directly, but rather to be fed to other tools that will do something useful with
the data.

One such diagnostic tool is called the *Slogulator*, which reads a slog file and
outputs it in a much terser, but more human readable format.  If can be found in
the `bin` directory of the `swingset-runner` package.  If you have
`packages/swingset-runner/bin` in your path, you'll be able to execute the
command
```
# slogulator slog > vslog
```

Note that it's probably best to redirect the slogulator output into a file,
because even though the output is shorter and more legible than the input, it's
still quite lengthy.  It's possible to extract just the slog lines for the
cranks you are interested in (say, cranks 7215-7495 to get just the contents of
the first benchmark round) and slogulate just this excerpt, which will work
fine, producing output that is shorter and generated more quickly, though there
are reasons to avoid doing this that we'll get to shortly.

For example, crank 11 (one of the first actually interesting cranks in the
execution of the benchmark setup phase) is represented in the slog file by 22
very long lines totalling about 5.6K, which I won't bother to quote here due to
their bulk and illegibility, whereas the corresponding slogulator output for
that crank is:


```
// crank 11: v1 bootstrap
crank-start: delivery crank 11
import: v1:@o-50 :: @ko22
import: v1:@o-51 :: @ko23
import: v1:@o-52 :: @ko20
import: v1:@o-53 :: @ko24
import: v1:@d-70 :: @kd30
import: v1:@d-71 :: @kd31
import: v1:@d-72 :: @kd32
import: v1:@d-73 :: @kd33
import: v1:@p-60 :: @kp40
deliver: @ko21 <- bootstrap({bootstrap: @ko21, comms: @ko22, timer: @ko23, vatAdmin: @ko20, vattp: @ko24}, {bridge: @kd30, mailbox: @kd31, timer: @kd32, vatAdmin: @kd33}): @kp40
invoke: @kd31.registerInboundHandler(@ko24)
result: undefined
export: v1:@p+5 :: @kp41
send: @ko24 <- registerMailboxDevice(@kd31): @kp41
subscribe: @kp41
vatstoreSet: idCounters := '{"exportID":10,"collectionID":7,"promiseID":6}'
crank-finish: 0.00580906867980957 crank 11
```

Here we can see that this is the delivery of the `bootstrap` message to vat 1,
the bootstrap vat, the event that really sets a swingset running.  This is part
of the base SwingSet setup procedure (unsurprisingly, given that we're only to
crank 11 at this point).  Roughly what happens here is: we import the various
object references mentioned in the `bootstrap` message argument list, plus the
promise for the result, then deliver the `bootstrap` message itself to the
object designated `ko21`, which is the root object of the bootstrap vat.  The
vat then calls the mailbox device's `registerInboundHandler` method to tell it
about the vattp vat and sends the vattp vat a `registerMailboxDevice` message to
tell it about the mailbox device.  It subscribes to the result of that message
send, then stores the initial values of various ID counters into the vatstore.
All of this takes 5.8ms.

However, even reduced with the slogulator, this still leaves a pretty big
haystack to look through -- about 150,000 lines worth.  So what can we do to
boil things down further, so we only have to look at stuff we actually care
about?

The first thing to do, just because it's super easy, is run slogulator again
with the `--nonoise` option, which makes it leave out various output lines that
aren't usually useful for debugging or performance engineering purposes (such as
imports and exports), and omitting routing cranks entirely.

```
# slogulator --nonoise slog > vslog
```

This reduces the output volume by about a quarter.

The next thing is to consider that for purposes of trying to understand what's
going on, we don't care about the setup cranks.  Indeed, we only really care
about the cranks for the first benchmark round (for that matter, we could have
gotten away with only running one round in the first place; we used 3 above
mainly for illustrative purposes).  Confining ourselves to just these cranks
leaves us with 3571 lines to look at.  Still a lot, but far, far less than
150,000.

Now we have to move beyond the analysis steps that are pretty much automatic and
unconditional.  Improving performance involves looking both at the big picture
(i.e., what operations are we doing? Are they all necessary or could some be
eliminated or folded together?) and at the closeup picture (i.e., could
individual operations be done faster?).  Let's take these in turn.

Notice that in the (reduced) slog, the bulk of the activity described consists
of vatstore operations.  These are important for performance engineering at the
closeup scale (and, of course, for debugging things that aren't working
correctly) but are pretty much visual noise if you're trying to understand the
big picture.  Here we can make use of another slogulator option, `--novatstore`,
which will omit the vatstore operations from the output.  This leaves us with
just under 600 lines describing 138 cranks to look at.  Now we're in a position
to see what happens when we do a vault open operation.

The 138 cranks of the round involve the participation of 8 different vats.
Interestingly, the `vaultFactory`, which is the vat that's actually creating the
vault and opening it, is only executing for 18 of those cranks.  Only 3 of those
cranks are processing messages received from other vats, while the remaining 15
are receiving notifications of the resolution of promises.

The first crank of the round slogulates as:
```
// crank 7216 v46 zcf-b1-d8a63-walletFactory
deliver: @ko816 <- handleBridgeAction({body: <BIG>, slots: ["board05262", "board0257"]}, true): @kp1886
send: @ko266 <- fromCapData({body: <BIG>, slots: ["board05262", "board0257"]}): @kp1887
```

Here we begin encountering mysteries.

Note that the `body` property of the first parameter to `handleBridgeAction` is
simply displayed as `<BIG>`, and similarly for the `fromCapData` message that
gets sent.  By default, this is how the slogulator displays any string value
longer than 200 characters.  It does this because it's not uncommon for messages
to contain strings that are very long, sometimes thousands or even millions of
characters, which both impedes readability and gets in the way of inspecting the
output.  It's also generally the case that these really long strings aren't ones
that you'll actually care about the details of, though this one might be an
exception.  There's a couple of ways to look into this.  One simple way is to
just go look directly at the original slog file.  If you search for
`"crankNum":7216`, the third match will be the delivery in question, from which
you can tease out that the string is about 650 characters long.  This is lengthy
but not crazy, and from the looks of it it's possibly meaningful for purposes of
this investigation.  You can change the slogulator's big string threshold with
the `bigwidth` command line option, for example `--bigwidth 1000`.  This may
result in the slogulator output being a bit bulkier than might be ideal, but
you'll be able to see things like the full content of the messages here.  Now we
see:

```
// crank 7216: v46 zcf-b1-d8a63-walletFactory
deliver: @ko816 <- handleBridgeAction({body: "#{"method":"executeOffer","offer":{"id":"open-vault-1-of-1-round-1","invitationSpec":{"callPipe":[["getCollateralManager",["$0.Alleged: BoardRemoteATOM brand"]],["makeVaultInvitation"]],"instancePath":["VaultFactory"],"source":"agoricContract"},"proposal":{"give":{"Collateral":{"brand":"$0","value":"+1000000"}},"want":{"Minted":{"brand":"$1.Alleged: BoardRemoteIST brand","value":"+5000000"}}}}}", slots: ["board05262", "board0257"]}, true): @kp1886
send: @ko266 <- fromCapData({body: "#{"method":"executeOffer","offer":{"id":"open-vault-1-of-1-round-1","invitationSpec":{"callPipe":[["getCollateralManager",["$0.Alleged: BoardRemoteATOM brand"]],["makeVaultInvitation"]],"instancePath":["VaultFactory"],"source":"agoricContract"},"proposal":{"give":{"Collateral":{"brand":"$0","value":"+1000000"}},"want":{"Minted":{"brand":"$1.Alleged: BoardRemoteIST brand","value":"+5000000"}}}}}", slots: ["board05262", "board0257"]}): @kp1887
```

Note that what is displayed here for the body string is not exactly valid JSON
-- the quotation marks are a little funky.  Slogulator favors legibility over
syntactic precision, so all the gajillion backslashes are gone.  This makes it
MUCH more readable but it also means the quotation marks can be ambiguous.
However, what you have here is basically just an extra set of quotes around a
smallcaps string with no further nesting.

The next mystery is the meaning of the various krefs you see here.  (Note that
slogulator always prefixes these with `@`.)  There are four krefs appearing in
this crank, two `koNN` refs (kernel objects) and two `kpNN` refs (kernel
promises).  The two promises are pretty straightforward to interpret just from
what's here.  `@kp1886` is the result promise for the `handleBridgeAction`
method that this crank is executing.  It's a promise that the `walletFactory`
vat will eventually resolve as a consequence of executing this method (or so one
hopes).  `@kp1887` is the result promise for the `fromCapData` message that the
`walletFactory` vat is sending here.  It's a promise that most likely will be
awaited by the `walletFactory` itself.

The slog only shows messages that enter or exit the vat, not messages
circulating internally within the vat, so all object references in the message
parameters are described by krefs (there's a slogulator mode to display them as
vrefs, but that's a more specialized tool that isn't useful or even relevant
here).  By definition, any kref has to be known across vat boundaries -- for an
object to be given a kref it has to have been exported by some vat.  In this
case, `@ko816` is the object to which the incoming message is being delivered,
so it must be one of the `walletFactory`'s own objects that had been exported
earlier (which is what allowed whoever sent the `handleBridgeAction` message
here to do so).  Similarly, `@ko266` is the object the `fromCapData` message is
being sent to, so we can infer that it had to have been imported into the
`walletFactory` as part of some earlier operation.  In neither case do we really
have much information about what those objects actually are though, so time to
go hunting.

Now we see why it's useful to work with the entire slogulated file rather than
just the excerpt:

If we search backward in the slogulator file for `@ko816`, we see that it's part
of the result of the `walletFactory` resolving `@kp1827` in crank 7026.
`@kp1827` in turn is the result promise from a `provideSmartWallet` invocation
in crank 6990, asking to provide a wallet for the address `"agoric1alice"` --
it's Alice's wallet!  We could follow the chain of causality backward further,
but for now I think we're happy enough just to know that `@ko816` is a wallet
and which wallet it is.  We can look forward and see there are two other
references to `@ko816`, the targets of `handleBridgeAction` messages at the
starts of the other two benchmark rounds.

Here it might be helpful to introduce another slogulator feature: the annotation
file.  While things like krefs are meaningful to SwingSet, they're not very
meaningful to humans, so slogulator provides a way to give things legible names.
The `--annotations FILENAME` option tells slogulator to read the JSON annotation
file `FILENAME` and apply it when generating it's output.  To record what we've
figured out so far, create `annot.json`:

```
{
  "kernelRefs":	{
    "kp1827": "provideSmartWallet/rp alice",
    "ko816": "aliceWallet"
  },
  "crankLabels": {
    "7216": "Start of benchmark round #1",
    "7497": "Start of benchmark round #2",
    "7762": "Start of benchmark round #3"
  },
  "bigWidth": 1000
}
```

and invoke slogulator again using it:

```
# slogulator --nonoise --novatstore --annotations annot.json slog > vslog
```

Now the piece of the slogulator output we've been examining looks like this:

```
// crank 7216: v46 zcf-b1-d8a63-walletFactory --- Start of benchmark round #1
deliver: <aliceWallet> <- handleBridgeAction({body: "#{"method":"executeOffer","offer":{"id":"open-vault-1-of-1-round-1","invitationSpec":{"callPipe":[["getCollateralManager",["$0.Alleged: BoardRemoteATOM brand"]],["makeVaultInvitation"]],"instancePath":["VaultFactory"],"source":"agoricContract"},"proposal":{"give":{"Collateral":{"brand":"$0","value":"+1000000"}},"want":{"Minted":{"brand":"$1.Alleged: BoardRemoteIST brand","value":"+5000000"}}}}}", slots: ["board05262", "board0257"]}, true): @kp1886
send: @ko266 <- fromCapData({body: "#{"method":"executeOffer","offer":{"id":"open-vault-1-of-1-round-1","invitationSpec":{"callPipe":[["getCollateralManager",["$0.Alleged: BoardRemoteATOM brand"]],["makeVaultInvitation"]],"instancePath":["VaultFactory"],"source":"agoricContract"},"proposal":{"give":{"Collateral":{"brand":"$0","value":"+1000000"}},"want":{"Minted":{"brand":"$1.Alleged: BoardRemoteIST brand","value":"+5000000"}}}}}", slots: ["board05262", "board0257"]}): @kp1887
```

The annotation file lets you label vats, krefs, vrefs, and cranks.  It also lets
you set the large string threshold instead of putting it on the command line
(since the ideal value is often closely tied to the data being slogulated).

For my own use I created a simple emacs function that watches for changes to the
annotation file and reacts to such changes by rerunning slogulator and
refreshing the buffer containing the slogulator output.  This way I can quickly
and interactively go through a slog and assign names to all the krefs, which
goes surprisingly fast if you start from the beginning.  No doubt similar hacks
can be constructed for other editors, and I'm quite sure this kind of
functionality could be packaged as a VSCode plugin if someone with the requisite
knowledge felt inclined to do so.

During some recent holiday downtime I used this emacs hack to work through the
whole slog file for this example and annotate all the krefs, including labeling
everything in the 7200 or so cranks of the chain startup sequence (by my count,
1845 promises, 814 objects, and 25 devices).  This exercise proved to be a
remarkably good way to get oriented to the chain startup flow, and since all the
different Benchmarkerator benchmarks use the same startup sequence the
annotations can be recycled for the other benchmarks as well (though the
annotation file will need to be updated if there are changes to the code
implementating the various on-chain vats).  I've added this annotation file
[`annot-vault-open.json`](./annot-vault-open.json) to the benchmark
documentation alongside this article to save you the effort, though going
through that effort for yourself can be quite educational if you are so
inclined.

Also attached is a fully annotated slogulator output excerpt,
[`vault-open-vslog`](./vault-open-vslog), containing just the 138 cranks of the
first vault open round.  From this I synthesized an even terser and reorganized
summary, found in the file
[`vault-open-vslog-reduced`](./vault-open-vslog-reduced).  I first regrouped the
cranks into separate sections according to vat, then cross referenced each
message delivery with the vat and crank number from which the message being
delivered was originally sent and each notification with the crank number of the
message send that created the promise and the vat and crank number in which the
promise was resolved.  Then, for each crank, I listed (in order) the sequence of
intervat actions (i.e., messages sent and promises resolved) performed during
that crank (though note that some cranks neither send messages nor resolve
promises).  For example, the boiled down vat summary for `vaultFactory` looks
like this:

```
vaultFactory: 18 cranks (3 delivery, 15 notify):

7276 deliver getCollateralManager-1 (sent from walletFactory in 7260)
  resolve getCollateralManager-1/rp
7280 deliver makeVaultInvitation-1 (sent from walletFactory in 7260)
  zoe <- makeInvitation-26
7284 notify makeInvitation-26/rp (sent in 7260, result from zoe in 7282)
  resolve makeVaultInvitation-1/rp
7301 deliver handleOffer-3 (sent from zoe in 7298)
  resolve handleOffer-3/rp
  bridge <- makeChildNode-85
  makeChildNode-85/rp <- makeChildNode-86
7319 notify makeChildNode-85/rp (sent in 7301, result from bridge in 7311)
  (no intervat action)
7324 notify makeChildNode-86/rp (sent in 7301, result from bridge in 7320) // this crank is where most of the magic happens
  zoe <- makeNoEscrowSeat-31
  zoe <- mintAndEscrow-2
  zoe <- replaceAllocations-3
  zoe <- replaceAllocations-4
  zoe <- exitSeat-3
  board <- toCapData-67
  board <- toCapData-68
  board <- toCapData-69
  bridge <- getPath-9
  resolve handleOffer-3/r/p (promise passed as part of resolution of handleOffer-3/rp)
7359 notify makeNoEscrowSeat-31/rp (sent in 7324, result from zoe in 7337)
  (no intervat action)
7360 notify mintAndEscrow-2/rp (sent in 7324, result from zoe in 7339)
  (no intervat action)
7361 notify replaceAllocations-3/rp (sent in 7324, result from zoe in 7341)
  (no intervat action)
7362 notify replaceAllocations-4/rp (sent in 7324, result from zoe in 7343)
  (no intervat action)
7365 notify exitSeat-3/rp (sent in 7324, result from zoe in 7345)
  (no intervat action)
7366 notify toCapData-67/rp (sent in 7324, result from board in 7348)
  bridge <- setValue-160
7368 notify toCapData-68/rp (sent in 7324, result from board in 7350)
  bridge <- setValue-161
7370 notify toCapData-69/rp (sent in 7324, result from board in 7352)
  bridge <- setValue-162
7372 notify getPath-9/rp (sent in 7324, result from bridge in 7354)
  resolve handleOffer-3/r/p/p (promise passed as part of resolution of handleOffer-3/r)
7397 notify setValue-160/rp (sent in 7366, result from bridge in 7380)
  (no intervat action)
7398 notify setValue-161/rp (sent in 7368, result from bridge in 7382)
  (no intervat action)
7399 notify setValue-162/rp (sent in 7370, result from bridge in 7384)
  (no intervat action)
```

A couple of notes on interpreting what you see here:

In my annotation file where I gave names to all the krefs, I followed the
convention of naming them according to how they were produced.  The overwhelming
majority of promises are the result promises for message sends.  These follow
the naming pattern `${methodName}-${NN}/rp`, where `methodName` is the method
name selector from the message, `NN` is a counter to indicate which send
occurance it was when the method was invoked repeatedly, and `/rp` means "result
promise".  For example, `makeChildNode-85/rp` is the result of the 85th
invocation of `makeChildNode` (in cases where a given message is only sent once,
the `-${NN}` is omitted).  There are a few promises that are sent as explicit
message arguments or contained in data objects sent as message arguments.  These
are given names suffixed with `/argp` or sometimes `/arg1p` or `/arg2p`.  In a
few cases a promise is passed as an element of the resolution value of another
promise, in which case I've suffixed the name `/r/p` (or, in one case `/r/p/p`
where a promise resolved to a structure containing a promise that later resolved
to a second structure that itself contained a promise).

Message sends are represented by notations of the form `${target} <-
${methodName}-${NN}`, where the target is usually indicated by the name of the
vat to which the message is being sent rather than the specific object to which
it is targeted, since the main thing we're trying to do with this summarized
form is construct a mental model of the intervat message flow.  In a few cases
the target of a message send is an unresolved promise, and in that case the
promise itself is named.  If for some reason the specific target object is of
interest, simply refer back to the unsummarized slogulator output (similar
reasoning applies for the message arguments, which are also elided in the
summary form but present in the slogulator output).

Promise resolutions are represented simply by `resolve ${promiseName}`.  Once
again, in this reduced form we're looking at the patterns of message flow, not
the contents (which, as previously alluded to, can be found in the slogulator
output).

So, what can we learn by looking at this boiled down representation of the vault
open operation, especially when considering performance issues?

Without digging in very deeply, a few things immediately stick out as potential
candidates for further investigation or contemplation:

In the actions for crank 7324, there is a sequence of three contiguous sends of
the same method to the same target:

```
  board <- toCapData-67
  board <- toCapData-68
  board <- toCapData-69
```

A short time later we see three contiguous notifications of the results of these
three sends.  While there may be very good reasons why the API is factored the
way it is, this pattern of three messages traveling in a flock raises the
question whether it might be profitable to consider changing the board API to
allow these kinds of requests to be sent in a batch, thereby amortizing the
message routing and dispatch overhead over a larger amount of work.  It's
entirely possible that the complications involved with assembling the batch and
then disassembling the response means that it wouldn't be worth the trouble, but
it's probably worth at least considering the question for a moment.

Looking more closely at the slogulator output for these, we can see that these
are requests to the board's marshaler to marshal a data object that is passed as
a parameter.  The board provides this service because, I presume (speaking
speculatively from a position of relative ignorance about the details of what
all these vats actually do), the `board` vat holds the registry table that maps
board names to object references.  However, the operation itself appears to be a
pure data transformation, so it raises the question whether outsourcing to an
external vat for marshaling is actually necessary.  If ZCF had a copy of the
mapping table, it could perform this operation itself without recourse to a
message round trip, though of course keeping the various contracts' ZCFs up to
date with changes to the name registry might be completely impractical.

Alternatively, we might consider that in most cases (including this one)
marshaling encodes data for transmission in a message sent elsewhere.  Further
perusal of the slog shows that, indeed, the result of these marshal operations,
after having been delivered to the `vaultFactory`, are passed onward in messages
to the `bridge` vat.  This suggests that possibility the `board` vat's API might
be augmented, either with an additional `target` parameter to `toCapData` or by
the addition of a new method with such a parameter, so that `vaultFactory` could
provide the ultimate destination for the marshaled data, which the board would
forward onward directly.  This would eliminate a round trip between
`vaultFactory` and `board` for each serialized message.  I could speculate that
one reason this was not done was because we anticipate such forwarding support
to be folded into the messaging infrastructure itself: instead of waiting for
the `toCapData` result to resolve and then sending that result in a message to
the board, `vaultFactory` would send the `toCapData` result promise itself in
its message to the board without bothering to wait for the promises
resolution. This would in turn mean the marshaled data would be delivered
directly to the `board` vat without passing through the `vaultFactory` vat at
all.  However, although we have discussed the idea of providing such a
forwarding mechanism, as far as I'm aware we have no immediate plans for
actually implementing it.  Consequently, adding some kind of explicit forwarding
support to the marshaler itself might be something to consider.

Another possibly interesting thing in crank 7324 is:
```
  zoe <- makeNoEscrowSeat-31
  zoe <- mintAndEscrow-2
  zoe <- replaceAllocations-3
  zoe <- replaceAllocations-4
  zoe <- exitSeat-3
```

Not only are these five messages sent one after another to the same target vat,
but a quick look at the undistilled slogulator output reveals that four out of
the five messages are actually sent to the very same object.  This suggests the
possiblity of giving Zoe some kind of composite method that would have the
effect of all these messages put together.  Of course, it's easy to think of
plausible reasons why this might be a bad idea: possibly the messages originate
in disparate parts of the `vaultFactory` code despite their temporal adjacency,
or perhaps this particular pattern of operations is unique to the needs of
`vaultFactory` and would not generalize usefully in a way that would make for a
sensible Zoe entry point.  However, it is another idea to inquire about.

While there might be additional performance gain opportunities to be discovered
with further perusal of the reduced slogulator output, in the interest of
expanding our diagnosis toolkit let's instead turn our attention to the closeup
scale alluded to at the start.  Here we are concerned with individual operations
and the time that they take.

Time to introduce another slogulator option, `--timing`.  This will cause
slogulator to augment its crank and syscall descriptions with timing
information.  For example, the first crank of the first benchmark round now
reports as:

```
// crank 7216: v46 zcf-b1-b5565-walletFactory [total:902µs local:790µs 87.58% syscall:112µs 12.42%] 4 syscalls
```

Timing information shows the total execution time for the crank, which is then
broken down into "local" and "syscall" components, which are, respectively, time
spent inside the vat code itself and time spent in the kernel processing
syscalls on the vat's behalf.  The latter two are also given as relative
percentages of the total execution time.  All time values are reported in
microseconds.

Syscalls (the main actions taken within a crank that are recorded in the slog)
are shown with individual execution times, also in microseconds.  For example,
our exemplar crank 7216 has four syscalls: a vatstore get, a message send, a
subscribe, and a vatstore set.  If you remove the `--novatstore` flag that final
vatstore will be shown as:

```
vatstoreSet: 'idCounters' := '{"exportID":26,"collectionID":57,"promiseID":174}' (17µs)
```

meaning it set the `'idCounters'` vatstore entry, taking 17 microsends to do so.

Note, BTW, that to see all four syscalls you also need to remove the `--nonoise`
flag in order to get the entry for the `subscribe` syscall.  There's one
`subscribe` for each `send`, subscribing to the result promise, plus one for
each promise that is received in a message; these are suppressed from the
slogulator output by the `--nonoise` flag because they're rarely of even remote
interest.  (And it's entirely possible that at some future point we'll just fold
`subscribe` into the normal behaviors of `send` and `deliver`, to spare some of
the syscall overhead.)

At this point it might be helpful to turn vatstore reporting back on by removing
the `--novatstore` flag from the slogulator command, which will cause all the
vatstore syscalls to become visible (as was done in the above example).
However, keep in mind that the number of syscalls in a crank is probably a more
important performance indicator than their individual execution times: most
syscalls complete quickly and tend to have fairly uniform execution times.  The
major notable exception to this uniformity are device invocations (_not_
suppressed by `--novatstore`!), whose times can vary quite a bit depending on
the specific operation being requested.

The primary reason, from a performance engineering perspective, to make the
vatstore syscalls visible is to inspect what keys are actually being manipulated
-- for example, you might want to look for patterns that hint at stored values
that could be consolidated, or just accesses to information that's not strictly
required for whatever operation is going on.  However, user code in vats does
not make vatstore syscalls directly.  Instead, these calls are the consequence
of operations on virtual objects and collections, and the keys and values thus
accessed are a consequence of how those operations are implemented in liveslots.
Nevertheless, you still might be wanting to look for ways to reduce the number
of such operations.  Unfortunately, looking at vatstore syscalls is a somewhat
indirect way to examine them, absent improved tools that we might create in the
future.  When attempting to analyze virtual object activity by looking at
vatstore syscalls, it's probably good to have some idea of what keys are used in
the realization of the various virtual object and virtual collection
abstractions.  If you look at vatstore usage patterns for a while, you'll begin
to get a sense of how these things work, but arguably would be better if we had
a document describing this for the benefit of people studying slog output; alas
_this_ document is not it.

(Individual syscall timing information may prove quite useful to kernel
engineers working on improving the performance of the syscall implementations
themselves, but since the focus in this document is performance tuning contract
vats, we won't say much more about that here.)

The obvious questions to ask when looking for performance improvement
opportunities are: Which cranks are taking the longest time to run?  Which
cranks are spending the most time executing their own code?  Which cranks are
spending the most time waiting for syscalls (both in total time and as a
fraction of total time)?  Which cranks are making the most syscalls?  (Due to
the mostly uniform nature of syscalls, the answers to the latter two questions
will almost certainly be highly correlated.)  As with some of our earlier
analyses, for our current mission, it makes sense to confine our scope to just
the 138 cranks of the first vault open round.  We can extract the crank header
lines from the slogulator report and then sort by each of the six numbers
reported in that line, then look at, say the top 5 in each category.

Top 5 cranks by total execution time:

```
// crank 7260: v46 zcf-b1-b5565-walletFactory [total:192036µs local:191577µs 99.76% syscall:459µs 0.24%] 11 syscalls
// crank 7324: v51 zcf-b1-7b711-vaultFactory [total:21673µs local:17573µs 81.08% syscall:4100µs 18.92%] 286 syscalls
// crank 7282: v9 zoe [total:5491µs local:4059µs 73.92% syscall:1432µs 26.08%] 111 syscalls
// crank 7301: v51 zcf-b1-7b711-vaultFactory [total:5047µs local:4303µs 85.26% syscall:744µs 14.74%] 46 syscalls
// crank 7339: v9 zoe [total:4340µs local:3061µs 70.54% syscall:1279µs 29.46%] 101 syscalls
```

Top 5 cranks by time spent executing locally (i.e. outside syscalls):

```
// crank 7260: v46 zcf-b1-b5565-walletFactory [total:192036µs local:191577µs 99.76% syscall:459µs 0.24%] 11 syscalls
// crank 7324: v51 zcf-b1-7b711-vaultFactory [total:21673µs local:17573µs 81.08% syscall:4100µs 18.92%] 286 syscalls
// crank 7301: v51 zcf-b1-7b711-vaultFactory [total:5047µs local:4303µs 85.26% syscall:744µs 14.74%] 46 syscalls
// crank 7282: v9 zoe [total:5491µs local:4059µs 73.92% syscall:1432µs 26.08%] 111 syscalls
// crank 7337: v9 zoe [total:3971µs local:3340µs 84.10% syscall:631µs 15.90%] 41 syscalls
```

Top 5 by clock time spent inside syscalls:

```
// crank 7324: v51 zcf-b1-7b711-vaultFactory [total:21673µs local:17573µs 81.08% syscall:4100µs 18.92%] 286 syscalls
// crank 7282: v9 zoe [total:5491µs local:4059µs 73.92% syscall:1432µs 26.08%] 111 syscalls
// crank 7339: v9 zoe [total:4340µs local:3061µs 70.54% syscall:1279µs 29.46%] 101 syscalls
// crank 7248: v16 zcf-mintHolder-ATOM [total:3863µs local:2831µs 73.29% syscall:1032µs 26.71%] 66 syscalls
// crank 7294: v9 zoe [total:4256µs local:3239µs 76.10% syscall:1017µs 23.90%] 73 syscalls
```

Top 5 by fraction of execution time spent inside syscalls:

```
// crank 7454: v14 bank [total:1828µs local:1217µs 66.57% syscall:611µs 33.43%] 41 syscalls
// crank 7230: v14 bank [total:2031µs local:1397µs 68.77% syscall:634µs 31.23%] 43 syscalls
// crank 7464: v9 zoe [total:1963µs local:1363µs 69.43% syscall:600µs 30.57%] 43 syscalls
// crank 7444: v16 zcf-mintHolder-ATOM [total:1782µs local:1238µs 69.49% syscall:544µs 30.51%] 40 syscalls
// crank 7252: v16 zcf-mintHolder-ATOM [total:2330µs local:1632µs 70.05% syscall:698µs 29.95%] 43 syscalls
```

Top 5 by number of syscalls:

```
// crank 7324: v51 zcf-b1-7b711-vaultFactory [total:21673µs local:17573µs 81.08% syscall:4100µs 18.92%] 286 syscalls
// crank 7282: v9 zoe [total:5491µs local:4059µs 73.92% syscall:1432µs 26.08%] 111 syscalls
// crank 7339: v9 zoe [total:4340µs local:3061µs 70.54% syscall:1279µs 29.46%] 101 syscalls
// crank 7294: v9 zoe [total:4256µs local:3239µs 76.10% syscall:1017µs 23.90%] 73 syscalls
// crank 7248: v16 zcf-mintHolder-ATOM [total:3863µs local:2831µs 73.29% syscall:1032µs 26.71%] 66 syscalls
```

Without delving more deeply, the first thing that leaps out is that the same
cranks reappear in several of these lists.  This is not a huge surprise, but it
_is_ interesting.  In particular, cranks 7282 and 7324 show up in 4 or the 5
lists, while crank 7339 shows up in three of them.  A few others (7248, 7260,
7294, and 7301) show up twice.

Crank 7324 was previously identified as the `vaultFactory` crank in which most
of the work of actually creating a vault happens.  It gets notification of a
promise resolution that appears to be the final hurdle before setting the vault
creation operation into full swing.  Crank 7324 is second in both total and
local execution time, and first in both syscall execution time and syscall count
(FYI, the 286 sycalls breakdown as: 267 vatstore, 9 send, 9 subscribe, and 1
resolve).  Looking more deeply into the record, it's down in 42nd place for
fraction of time spent in syscalls, which is interesting given that it has the
most absolute time in that category.  This is a testamonial to the fact that
even though it's #1 in syscall count, it's even more of an outlier in terms of
local computation.

Crank 7282 is the delivery of a `makeInvitation` message to the `zoe` vat.  It's
third in total execution time, fourth in local execution time, and second in
both syscall time and count.  Although `makeInvitation` only appears once per
vault open round, it appears to be one of the more common operations overall,
appearing 28 times in this log (25 times during setup and then once in each of
the 3 benchmark rounds).  Stepping outside the specific benchmark for a moment,
if we look at the entire slogulator output at all 28 `makeInvitation` deliveries
we can see that their execution times are all roughly similar.  My understanding
is that much the operation of contracts involve invitations, so given its
relatively heavy weight, the handler for `makeInvitation` might be a good target
for examination with respect to not just vault creation but overall chain
performance.

Crank 7260 is tops in both total and local execution time.  It's unclear to me
what it's doing (it's handling another promise notification) but it seems worthy
of further study.

Crank 7301 is #4 in total execution time and #3 in local execution time.  It's
handling the delivery of a `handleOffer` mesage to the `vaultFactory`.  This
seems like another major component of the vault creation flow.

These four cranks seem like good candidates to examine more closely, but for
illustrative purposes let's look at 7324, since it seems to play a central role
in the fundamental operation we are examining here.  The first step is to get
some profiling data, so run:

`# tsx benchmark-vault-open.js --node --profile v51 >& log`

For this we need to run the workers in Node processes (so the V8 profiler can be
brought to bear on an individual vat) and we don't care about the slog or kernel
stats output.  We know from the slog output that we've been studying that the
`vaultFactory` is vat `v51`, so we'll tell the benchmark to profile that.

After executing the above command, there will be file left behind named
something similar to `CPU.v51-zcf-b1-33517-vaultFactory.cpuprofile`.  This is
the collected profile data for the `vaultFactory` vat, which we can examine in
the Chrome browser's development tools.  Open the Developer Tools and select the
Performance tab, then click the "Load profile..." button, then select the file
containing the profile data file.  Chrome will display a flame graph for the
vat.

![Flame graph of `vaultFactory` for benchmark](./flamegraph1.png)

On my machine this run produces about a 2700ms timeline, where crank 7324
happens around the 2470ms mark.  Determining this did require some poking around
and zooming in and out to locate it, but zooming in around that point in the
timeline yields a closeup view of the one crank:

![Flame graph of `vaultFactory` crank 7324](./flamegraph2.png)

Zooming in more closely lets you see some of the details:

![Flame graph of `vaultFactory` crank 7324 details](./flamegraph3.png)

Chrome also lets you look at whatever subset of the execution flamegraph that's
displayed by showing an outline-style list of the various JavaScript functions
that are being executed, organized in either bottom-up or top-down form, simply
by clicking on one of the tabs show below the flame graph.

(Note: similar profile analysis tools are also available for VSCode as
third-party plugins; see the VSCode docs to learn more.)

A couple of important caveats about this profiling data (regardless of whether
you're looking at it in flamegraph or tabular form): Because V8 collects these
numbers by periodically sampling the program counter rather than by
instrumenting the code's actual call/return behavior, the observed call graph
will be lossy, and fast functions might not be seen at all.  Further, in order
to get the most accurate data possible, the current sampling interval is set to
the finest level of detail V8 supports, 1 millisecond, a consequence of which is
that when profiling is enabled, vats being profiled will run considerably
slower.  This slowdown is not a problem for performance measurement per se,
since we're concerned about relative rather than absolute timing values, but it
does mean benchmark tests can take an annoyingly longer time to execute when
profiling is turned on.
