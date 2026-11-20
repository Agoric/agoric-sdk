# Cosmos–Agoric VM bridge

The embedded and split-process adapters implement the same JavaScript interface,
defined by the JSDoc types in [agcc-shim.js](../src/agcc-shim.js):

```js
const sender = bridge.start(handleMessage, argv);
const responseJSON = sender.send(goServicePort, messageJSON);
```

`start` accepts a function and a nonempty array of strings including `argv[0]`.
It may be called once. Invalid arguments do not consume that start opportunity.
It returns a sender facet containing only `send`; the bridge itself does not
expose a sender before startup. The embedded adapter starts Go with `argv`. In
split mode, Go is already running and has consumed the command line: `argv` is
validated startup metadata, not a second request to launch a daemon.

The handler receives `(port, messageJSON, replier)` asynchronously on the main JS
thread. It resolves or rejects the replier with a string. Only the first
settlement takes effect. Go actions carry node port 1; JS asserts that value
before dispatching to the chain handler. There is no dynamic inbound routing-port
registration or synthetic daemon-port result.
Logical ports remain meaningful in `send`: they select registered Go services.
`send` validates a positive integer port at most `2**31 - 1` and a string message,
then synchronously waits for and returns a string response.

By default, Go service errors are returned as JSON text such as `{"error":"unregistered
port 7"}` in both adapters, preserving the embedded convention. In split mode,
the adapter converts the RPC error string into that response shape. A response
that already contains application error JSON is passed through unchanged.
Malformed replies and local protocol failures throw instead of being converted
into application responses.

Each call can override service-error handling with
`send(port, messageJSON, { handleError })`. The handler receives the Go error
string and can return replacement response text or throw. Direct Node.js host
calls for storage and SwingStore export updates use
`{ handleError: error => { throw Error(error); } }` so a failed operation cannot
be mistaken for a result. Vat bridge calls retain the default JSON convention;
the vat bridge manager checks the error object and rejects the caller's promise.
The option handles service errors only, not malformed replies or local protocol
failures. A successful response containing application error JSON is still
returned unchanged. Error handlers are not included in persisted downcall
replay records.

## Process and capability boundaries

Embedded mode uses the native addon in
[`golang/cosmos/src/agcosmosdaemon-node.cc`](../../../golang/cosmos/src/agcosmosdaemon-node.cc)
and the C-shared Go library. Its startup and callbacks follow the same interface
as the external adapter. Native reply IDs are private to each replier object;
they are not logical ports and are not exposed as strings with special prefixes.

In split mode, `agd` owns the Go application and launches the VM executable.
The JS entrypoint supplies the external adapter with a synchronous writer,
factories for its input and lifetime-monitor workers, and completion/error
callbacks. The adapter and
configuration selector do not read process environment or acquire filesystem
and worker authority at module-import time.

```mermaid
sequenceDiagram
    participant Go as Go application
    participant Worker as JS input worker
    participant JS as JS main thread
    Go->>Worker: RPC action request, ID A
    Worker->>JS: Dispatch action with replier A
    JS->>Worker: Register expected response ID B
    JS->>Go: Synchronous service request, ID B, logical port
    Go->>Worker: Service response, ID B
    Worker->>JS: Wake shared-memory reader
    JS->>Go: Resolve or reject action A
```

There is one shared response buffer for synchronous JS-to-Go calls. During an
atomic wait, the JS main thread cannot dispatch another Go action. The supported
nesting is Go action → JS handler → synchronous Go service → JS continues → Go
action reply. A Go service must not synchronously depend on a new JS callback
while JS is waiting for that service. This does not imply that all asynchronous
Go-to-JS actions are globally serialized by the adapter.

## File descriptors and selection

`AGVM_INPUT_FD` is the descriptor on which the VM reads messages from `agd`.
`AGVM_OUTPUT_FD` is the descriptor on which the VM writes messages to `agd`.
Neither variable set selects the native adapter. Otherwise both must be set to
nonempty decimal digit strings. Leading zeros are allowed; signs, whitespace,
fractions, suffixes, hexadecimal notation, and values above `2**31 - 1` are
rejected. This is the nonnegative signed-32-bit descriptor range accepted by the
bridge's Node filesystem interface, not a shell portability guarantee. Numeric
constructor arguments are checked against the same range.

Go's `exec.Cmd.ExtraFiles` starts at descriptor 3. The launcher reserves that slot
for Node parent/child IPC, uses descriptor 4 for VM input and descriptor 5 for VM
output, and supplies those values in the two environment variables. Standard
input, output, and error retain their normal roles. The adapter constructor
takes `(inputFd, outputFd, io)` directly; there is no nested JSON descriptor spec.

The old `AGVM_FROM_AGD` and `AGVM_TO_AGD` names are not part of the new contract.
The Go and JS halves must be updated together; no external VM implementations
require compatibility with the old protocol.

## Split-process wire protocol

Messages are newline-terminated JSON RPC records using Go's `net/rpc/jsonrpc`
format, without a JSON-RPC 2.0 version member. Method names are named constants
in [agcc-agvm.js](../src/agcc-agvm.js), cross-referenced with
[`vm/client.go`](../../../golang/cosmos/vm/client.go). Application messages have
the lower-camel-case Go struct tags `port`, `data`, and `needsReply`:

```json
{"method":"agvm.ReceiveMessage","params":[{"port":1,"data":"action JSON","needsReply":true}],"id":0}
{"method":"agd.ReceiveMessage","params":[{"port":7,"data":"request JSON","needsReply":true}],"id":1}
{"id":1,"result":"response JSON","error":null}
{"id":0,"result":null,"error":"rejected action"}
```

RPC IDs correlate requests and replies within each direction; ID zero is valid.
They are independent of Go logical service ports. Both directions can use the
same numeric ID without confusing an incoming request with a service response.
The input worker routes response records to the synchronous waiter; action
requests reach the main handler. Unrecognized methods and malformed action
records produce diagnostics containing the offending message and expected
method. A synchronous response must have the expected ID, with either a string
result and null error, or a null result and string error. Other response shapes
fail the transport.

`needsReply: false` means no application reply is required. Go's RPC client still
requires an RPC acknowledgement. The external adapter sends the string
`<no-reply-requested>` immediately rather than waiting for application
settlement. The native `ClientCodec` fabricates the same acknowledgement. Later
application settlements of these no-reply messages do not produce another reply.

## RPC ownership and worker protocol

[`rpc-service.js`](../src/helpers/rpc-service.js) runs on the JS main thread. It
owns request IDs, pending inbound IDs, outgoing serialization and newline framing,
request/reply correlation, completion, and shutdown. `agcc-agvm.js` adapts the
application's port/message/replier interface to that service; it does not write
RPC records or allocate correlation IDs independently.

[`agd-input-worker.js`](../src/agd-input-worker.js) acquires the input stream and
uses [`rpc-input.js`](../src/helpers/rpc-input.js) to parse and classify records.
The reader owns the input descriptor, including closing it at completion. Pipes
and sockets use libuv polling rather than a blocking filesystem read, so shutdown
can cancel input while the Go peer keeps its write end open. Regular files use a
filesystem stream. Shared library modules receive their IO from entrypoints.
File-input test fixtures open and close their files within the reader worker,
keeping Node's automatic descriptor cleanup in the same worker as ownership.

The typed parent/reader messages are defined in `rpc-service.js`:

| Message | Direction | Meaning |
| --- | --- | --- |
| `INIT_LOOP` | Main → reader | Start once with input FD, shared lifecycle state, and lifetime lease port. |
| `INTERCEPT_ID` | Main → reader | Register one expected response ID and its shared transfer buffer before writing the request. |
| `RECV_OBJ` | Reader → main | Dispatch a parsed inbound request; responses stay in the reader and go to the registered transfer. |
| `STOP_LOOP` | Main → reader | Cancel input after the main thread has entered orderly shutdown with no pending calls. |
| `FINISH_LOOP` | Reader → main | Finish with an explicit error, or null only after orderly shutdown. |
| `WATCH_READER` | Main → monitor | Supply the shared lifecycle state and the other end of the reader's lifetime lease. |

Unknown messages in either direction fail visibly. Duplicate registration,
duplicate pending inbound IDs, unmatched response IDs, malformed JSON, read/write
errors, dispatch errors, and unexpected worker completion fail the service.
Only one synchronous outbound call can be active; overlap is rejected before
another registration or write. Asynchronous inbound requests can settle out of
order. Each reply removes its pending ID; duplicate or late application
settlements do not emit a second response. The reader drops its pending transfer
reference when a response arrives, and failure clears pending state. No explicit
garbage-collection hooks are needed.

## Failure detection and shutdown

Unexpected EOF is a transport failure, including when no call is pending. It
never fabricates a successful response for an outstanding call. Malformed input,
worker errors/exits, and explicit `stop(reason)` reject service completion and
fail outstanding work. Once failed, the service cannot restart.

Main-thread event handlers cannot release a main thread blocked in
`Atomics.wait`. [`rpc-lifecycle.js`](../src/helpers/rpc-lifecycle.js) therefore
publishes failure in shared memory independently of the transfer header. Both
transfer participants inspect this state at every wait, polling at most every
100 ms while blocked. That interval checks failure state; it is not a deadline
for healthy Go requests. Failure publication also has an observable in-progress
state, so a publisher disappearing before it finishes writing a diagnostic
cannot strand a caller.
During publication, a waiter can report the generic `RPC transport failed`
before the detailed diagnostic is available.

[`rpc-monitor-worker.js`](../src/rpc-monitor-worker.js) independently watches a
`MessagePort` lease held by the reader. Reader disappearance closes the lease,
allowing the monitor to publish failure while the main thread is blocked. The
reader likewise fails if the monitor disappears. This also covers interruption
in the middle of a response transfer. Normal main-thread `error`, `exit`, and
`messageerror` handlers handle failures when the event loop is available.

Orderly shutdown is explicit. Go calls the reserved `agvm.Shutdown` RPC method;
the main service verifies no outbound call or inbound reply remains pending,
marks shared state as stopping, replies with `<shutdown>`, and sends `STOP_LOOP`.
The reader cancels input and marks the shared state closed before releasing its
lease and sending successful completion. Local `close()` follows the same
shutdown path without a wire acknowledgement and is idempotent. Shutdown with
pending calls fails instead of discarding them. Late replies after failure are
ignored, and completion terminates both workers.

Go bounds the handshake, then closes its pipe and reaps the VM even if the
handshake failed or timed out. A single waiter owns process reaping; shutdown and
the unexpected-exit observer share that result. Existing interrupt/kill grace
periods remain as a fallback and are cancelled when the VM exits. Expected exit
during shutdown is not reported as premature VM exit.

## Process lifetime ownership

The old `whenHellFreezesOver` variable and its unresolved promise remain
removed. An unresolved promise alone does not keep Node's event loop alive.
The runtime's active handles and explicit shutdown protocol own its lifetime.

In embedded mode, the native addon retains a referenced `ThreadSafeCallback`
dispatcher backed by a libuv async handle. That handle keeps Node available for
Go callbacks while the Go daemon runs in a background goroutine. Go owns the
command's completion and exit status; a finite command can return successfully,
while an unexpected return from `start` is an error. Native completion uses the
immediate termination path described below. The lifetime contract does not
depend on retaining an application promise.

In split mode, the main thread retains the reader and monitor workers. Their
message listeners, the reader's input stream, and the monitor's lease keep the
connection active. The RPC completion promise observes their lifecycle; it is
not a substitute for those active handles. Orderly completion cancels input and
terminates both workers before the entrypoint exits successfully. Failure
rejects completion, terminates the workers, and makes the entrypoint exit with
an error. The Go parent owns the child process and its single reaping waiter,
including bounded shutdown escalation if the VM does not finish.

The real-chain lifecycle probe exercises signal shutdown in both modes and
finite export/bootstrap-state completion. The focused RPC tests additionally
cover EOF, pending replies, cancellation with an open peer pipe, and worker
disappearance. These checks validate actual lifetime resources and completion,
without restoring the historical unresolved-promise workaround.

## Configurable transport diagnostics

The JS runtime uses the repository's `anylogger` adapter with logger name
`ag-chain-cosmos:rpc`. Transport detail is emitted at debug level. Enable it
with the standard selector, for example from the SDK root:

```sh
DEBUG=agoric:debug bin/agd start --split-vm
```

`DEBUG=agoric` is an alias for the same level. Default settings omit debug events;
`DEBUG=agoric:none` disables JS runtime logging. The existing adapter supplies
timestamps and the stable logger label.

Debug events identify bridge selection and descriptors, service startup,
incoming/outgoing RPC method names and IDs, response IDs and error flags,
shutdown, and completion. Failure context includes the active outbound ID and
pending inbound reply count. These events omit application request/result
payloads. Terminal failure reporting retains the underlying error diagnostic.

The entrypoint creates the logger and passes only a debug facet through the
adapter to the RPC service. Shared protocol modules acquire no logging or
environment authority themselves. Logging is optional for other callers, and a
logger exception cannot interrupt framing, settlement, or failure wakeups. The
entrypoint owns terminal error reporting and process exit.

Pipe input uses the `BufferLineTransform` pipeline with strict line decoding;
the default output capability uses complete synchronous record writes on its
inherited descriptor. Correctness coverage includes fragmented and coalesced
records, LF/CRLF and final unterminated lines, input/dispatch errors and
cancellation, JSON payloads through 1 MiB, and bidirectional RPC responses larger
than the shared transfer buffer. No timing or throughput target is imposed by
these tests.

## Transfer and codec details

The [shared-memory transfer contract](shared-memory-transfer.md) documents F4's
layout, ownership, state machine, generator handoffs, and stale-ID regression.
It also describes F5's strict UTF-8 decoding, incremental encoding into reusable
destinations, explicit byte counts, and insufficient-capacity behavior. Line
input rejects malformed UTF-8 before parsing RPC records.

## Verification in CI and locally

The `VM integration (embedded)` and `VM integration (split)` matrix jobs in
[`test-golang.yml`](../../../.github/workflows/test-golang.yml) run on every pull
request, merge-group run, and push to master. They run the same lifecycle probe
against the real daemon, native addon or pipe adapter, SwingSet kernel, and XS
worker. The bootstrap vat is intentionally small: it registers an inbound
bridge handler and writes a known value through the storage bridge. This tests
the transport independently of application proposal bootstrapping.

Run either mode from the SDK root after installing dependencies and building:

```sh
bin/agd build
node packages/cosmic-swingset/tools/test-vm-mode.js embedded
node packages/cosmic-swingset/tools/test-vm-mode.js split
```

The probe invokes `bin/agd`, creates an isolated validator home, uses loopback
ports, waits for committed blocks, and queries the vat's stored value. It then
checks bounded SIGINT shutdown, exports genesis and SwingStore artifacts,
restarts the chain, and reconstructs a copy's consensus state using the live
node as a light-client source. The copy retains application/SwingStore data but
has empty consensus databases. `comet bootstrap-state` runs without `--height`,
so it must open the application to obtain its committed height. The two RPC
server entries point at this same isolated source; this verifies the command
and transport, not independent-provider trust or adversarial state sync.

Embedded SIGINT shutdown uses exit code 98. Split shutdown can return 0 through
the SDK or 98 through its signal handler; the test additionally requires both
the explicit RPC shutdown event and completed worker teardown. Each subprocess
has bounded execution or shutdown, and failure cleanup kills its process group.
Logs and generated homes remain in the printed artifact directory; CI uploads
command logs on failure. Set `VM_TEST_ARTIFACTS` to choose that directory.

The focused tests run in the ordinary package test job. Their coverage maps to
the protocol boundaries as follows:

| Test | Contract checked |
| --- | --- |
| [`sync-xfer.test.js`](../test/sync-xfer.test.js) | Real worker/client/server transfers, static wire bytes, every yielded and returned chunk, state/length validation, repeated reuse, reentrancy rejection, and the deterministic stale response-ID race (16518 → 16519). |
| [`utf8-codec.test.js`](../test/utf8-codec.test.js) | Encoding into reusable destinations, Unicode boundaries, malformed/truncated UTF-8, small capacities, and peer abort on codec errors. |
| [`rpc-service.test.js`](../test/rpc-service.test.js) | Request/reply correlation, forbidden overlapping synchronous calls, asynchronous settlements out of order, malformed records, unexpected worker messages, input/write failures, pending-reply EOF, and reader/monitor termination during blocked or partial transfers. |
| [`read-fd-lines.test.js`](../test/read-fd-lines.test.js) | Fragmented/coalesced records, line endings, sizes through 1 MiB, strict decoding, EOF, cancellation, and input/dispatch errors. |
| [`agcc.test.js`](../test/agcc.test.js) | Both adapter interfaces, service-error handling, node-port assertion, descriptor selection, and real bidirectional pipes. |

These checks have no throughput target. Separate upgrade and sustained follower
runs are outside this verification scope.

The lifecycle regression also verifies successful completion of embedded
`bootstrap-state`. Both it and `start` open the application through `OnAppHook`,
which prepares the VM connection. Only the `start` command invokes
`OnStartHook`, after validating configuration, to treat an unexpected VM return
as exit code 99. Opening the application for a finite command does not imply
that it must run forever.

After a finite embedded command completes, its Go goroutine terminates the
process with C `_Exit`. This preserves immediate termination without libc exit
handlers running alongside Node's main thread. On Darwin, Go's `os.Exit` uses
libc `exit`; native export testing exposed an intermittent abort during Node
inspector cleanup on that path. The lifecycle probe requires two successful
exports with identical application state before it proceeds to bootstrap-state.
