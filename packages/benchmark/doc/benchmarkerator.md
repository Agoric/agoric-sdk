# The Benchmarkerator

*The Benchmarkerator* is a tool for creating and running chain benchmarks.  It
is loosely inspired by Ava.  Of course, since its purpose is performance testing
rather than correctness testing, it does differ from Ava quite a bit.  Two big
differences you may notice immediately are that it's much, much simpler and that
benchmark modules are standalone Node executables rather than things to be
driven by an external orchestrator program.

Note that the current version of The Benchmarkerator is specifically designed
for performance testing things that run on chain[^1], i.e., vats and contracts.
A lot of what it does is manage the configuration and setup for a swingset with
all the various chain components up and running.  While it should be easy for us
to adapt it to also support benchmarking things that run in vats more generally
without the rest of the chain-specific infrastructure, that is for the future
and only if there is demand for it.  We are not currently planning to adapt it
for non-swingset benchmarking, though it is possible that a similar tool may be
concocted for that purpose should it seem warranted.

[^1]: The term "chain" is slightly confusing here, but will have to do until the
    product folks give us better terminology.  There is no actual chain per se,
    merely a swingset containing the various vats and contracts that make up the
    default Agoric ecosystem, along with an ersatz bridge device that can be
    used to inject message traffic as if it had originated from actual Cosmos
    messages.

## Writing a benchmark

By convention a benchmark should be placed in source file a named
`benchmark-yourbenchmarkname.js` (substitute your own benchmark name of course),
which, by convention, goes in the `benchmarks` directory of your package,
parallel to the conventional `test` directory (as of this writing very few
packages have such a `benchmarks` directory, so you might need to add it
yourself).[^2]

[^2]: In the fullness of time, the `yarn bench` command will be updated to run
    all the benchmarks found in the `benchmarks` directory, much as it now runs
    the older, Ava-based benchmarks that it looks for in the `test` directory.
    Those will themselves be deprecated and/or moved into `benchmarks`.
    However, as of this writing that has not yet been done.

The first thing a benchmark should do is import The Benchmarkerator:
```
import { bench } from '@agoric/benchmark';
```

Note that this importation usually should be the very first thing you do, much
as you typically import `@agoric/swingset-vat/tools/prepare-test-env-ava.js` or
`@agoric/zoe/tools/prepare-test-env-ava.js` or the like as the first thing in a
test implementation.  The exception, as with tests, is imports that bring in any
kind of pre-lockdown functionality that you will be needing to use; however,
that should be necessary only in very specialized circumstances.

In a manner similar to the way tests are packaged for Ava, a benchmark file can
actually contain multiple benchmark tests.  Each should be declared with a
statement of the form:

`bench.addBenchmark(label: string, benchmark: Benchmark);`

where `label` is a string labelling the benchmark (much as individual tests are
labelled in Ava), and `benchmark` is an object describing the benchmark itself
(which will be described in detail below)

After defining one or more benchmarks with `addBenchmark` you must then end by
invoking:

```await bench.run();```

### The `Benchmark` object

The `benchmark` object may have the following properties, all of which are
optional except for `executeRound`:

`setup?: (context: BenchmarkContext) => Promise<Record<string, unknown> | undefined>`

  An optional async method to perform any pre-run setup that you need to do. It
  may optionally return a configuration record containing any benchmark-specific
  information you desire.  This will be provided as part of the context object
  in subsequent calls into the benchmark.

`executeRound: (context: BenchmarkContext, round: number) => Promise<void>`

  A required async method which is called to actually execute one round of the
  benchmark.  The `round` argument is the number of the benchmark round
  that this call to `executeRound` is being asked to execute (counting from 1).

`setupRound: (context: BenchmarkContext, round: number) => Promise<void>`

  A optional async method which is called to perform initializations required
  for a single round of the benchmark.  It is called immediately before calling
  `executeRound` but its execution time and any resources it consumes will not
  be accounted against the stats for the round in question.  The `round`
  argument is the number of the benchmark round that the corresponding call to
  `executeRound` is being asked to execute (counting from 1).

`finishRound: (context: BenchmarkContext, round: number) => Promise<void>`

  A optional async method which is called to perform teardowns required by a
  single round of the benchmark.  It is called immediately after calling
  `executeRound` but its execution time and any resources it consumes will not
  be accounted against the stats for the round in question (or the round that
  follows).  The `round` argument is the number of the benchmark round that the
  corresponding call to `executeRound` that just completed execution (counting
  from 1).

`finish?: (context: BenchmarkContext) => Promise<void>`

  An optional async method to perform any post-run teardown that you need to do.

`rounds?: number`

  The number of benchmark rounds that will be run if not overridden on the
  command line.  If no number is provided either here or on the command line, a
  single round will be run.

### The `BenchmarkContext` object

The first parameter to each of the benchmark methods is a context object that
provides various information about the execution.  It has the properties:

`options: Record<string, string>`

  Named configuration options from the command line (see Command Line below).

`argv: string[]`

  Remaining unparsed arguments from the command line.

`actors: Record<string, SmartWalletDriver>`

  Wallet drivers for the various personae that exist in the test environment.
  Currently present are `gov1`, `gov2`, and `gov3` (the governance committee);
  `atom1` and `atom2` (ersatz ATOM-USD price feed oracles); and `alice`, `bob`,
  and `carol` (arbitrary users to participate in interactions being exercised).

`label: string`

  The benchmark label, from the `addBenchmark` call that defined this benchmark.

`rounds: number`

  The total number of benchmark rounds that are to be executed in this run.

`config?: Record<string, unknown>`

  The configuration object that was returned by the `setup` method, if one was.

## Executing a benchmark

The benchmark that you define by incorporating The Benchmarkerator is a
standalone Node executable.  You run it with the command:

`tsx benchmark-yourbenchmarkname.js [OPTIONS...]`

The supported command line options are:

| Option | What |
|--------|------|
| `-r N`<br/>`--rounds N` | Execute _N_ rounds of each benchmark |
| `-b PATT`<br/>`--benchmark PATT` | Only execute benchmarks matching _PATT_ (may be specified more than once; this is similar to Ava's `-m` option)|
| `-c NAME VAL`<br/>`--config NAME VAL` | Set configuration option _NAME_ to _VAL_ in the `context.options` record (may be specified more than once)  |
| `-v`<br/>`--verbose` | Enable verbose output |
| `--vat-type TYPE` | Use the specified vat manager type rather than the default `xs-worker` |
| `-l`<br/>`--local` | Shorthand for `--vat-type local` (vats run in the same process as the kernel; less realistic than `xs-worker` but much faster and easier to debug) |
| `-n`<br/>`--node` | Shorthand for `--vat-type node-subprocess` |
| `-x`<br/>`--xs` | Shorthand for `--vat-type xs-worker` |
| `-o PATH`<br/>`--output PATH` | Output JSON-formated benchmark data into a file named _PATH_ |
| `-s PATH`<br/>`--slog PATH` | Output a slog file into a file named _PATH_ |
| `-p VATID`<br/>`--profile VATID` | Collect CPU profile data for vat VATID (may be specified more than once) |
| `-d VATID`<br/>`--debug VATID` | Enable debug mode for vat VATID (may be specified more than once) |
| `-h`<br/>`--help` | Output this helpful usage information and then exit |

VATIDs take the form of a "v" followed by decimal digits, e.g, "v9" or "v47".

An optional `--` flag ends the options list.  Any remaining command line
arguments after `--` are are passed to the benchmark itself in the
`context.argv` array.

Note that benchmarks are run with `tsx` rather than `node`.  This is because the
benchmarking tools make use of TypeScript code that is part of our test
infrastructure.  `tsx` actually runs `node`, but makes sure all the various
magic environment voodoo is set up so that TypeScript code can also be
executed.  If you do not have `tsx` in your environment, it can be installed
from NPM.

## Results output

Timing results and other collected metrics are output to _stdout_.  Two batches
of information are provided: one for the setup phase and one for the benchmark
rounds themselves (in aggregate).

If you specify the `--output FILEPATH` command line option, a JSON-formatted
(i.e., machine readable) version of this same data will be output to the
indicated file.

Output results include execution times (according to Node's nanosecond clock),
crank counts, and the various kernel resource usage data reported by
`controller.getStats()`.

Per-vat JS engine-level profiling is enabled for a given vat via the `--profile
VATID` command line option.  Note that this option is only available when the
vat manager type is `node-process` or `xs-worker`.  For `node-process` vats, the
profiling data will be placed in the file `CPU.${vatID}-${vatName}.cpuprofile`.
The `.cpuprofile` file format can be read and displayed by Chrome debugger, VS
Code plugins available for this purpose, and various other tools.  For
`xs-worker` vats, profiling data format is TBD.

In addition, if you specify the `--slog FILEPATH` command line option, a
SwingSet slog file for the run will be output to the file indicated.
