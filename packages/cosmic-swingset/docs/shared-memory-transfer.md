# Shared-memory byte transfers

[`sync-xfer.js`](../src/helpers/sync-xfer.js) provides one synchronous reader and
writer over a reusable fixed `SharedArrayBuffer`. It transports bytes through
generator-based codecs; it does not require JSON or text. An endpoint may be
reused after a completed transfer, but overlapping or reentrant operations are
invalid.

## Layout and ownership

| Byte offset | Representation | Meaning |
| --- | --- | --- |
| 0 | `state: int32` | Atomic handoff state shared by reader and writer. |
| 4 | `dataLength: int32` | Number of valid payload bytes in the current chunk. Written by the writer, read by the reader. |
| 8 onward | `payload: uint8[]` | Borrowed byte storage. The writer owns it until publication; the reader owns it until acknowledgement. |

`makeTransferBuffer`, `assertTransferBufferSize`, and `partitionTransferBuffer`
share the validation contract. Total size must be an integer from 9 through
`8 + (2**31 - 1)` bytes: two control words plus at least one payload byte, with
payload capacity representable by a nonnegative signed `dataLength`. The upper
bound describes protocol representation, not a promise that an allocation of
that size will succeed. Growable buffers and ordinary `ArrayBuffer` instances
are rejected. Payload size need not be divisible by four.

The receiver checks every published length against `[0, payload.byteLength]`;
it never silently clamps a corrupt length. The writer can split a larger encoder
chunk into payload-sized fragments. Zero-length chunks are allowed, including
an empty final result.

## Handoff states

The numeric values are exported as `TRANSFER_STATE` for protocol peers and tests.

| State | Value | Meaning / next owner |
| --- | --- | --- |
| `IDLE` | 0 | Initial state and completed final handshake. The reader may register a new transfer. |
| `READER_READY` | 1 | The reader requests initial registration, or acknowledges a non-final chunk. The writer may proceed. |
| `WRITER_READY` | 2 | The writer has registered. It may publish the first chunk; the reader waits for data. |
| `CHUNK_AVAILABLE` | 3 | A non-final fragment is available. The reader owns its bytes. |
| `FINAL_CHUNK_AVAILABLE` | 4 | The last fragment of the encoder's final return is available. The reader owns its bytes. |
| `FINAL_CHUNK_CONSUMED` | 5 | The reader has consumed the final bytes and completed its decoder. The writer may release the transfer. |
| `ABORTED` | 6 | Terminal protocol/codec failure. Both endpoints fail; the buffer cannot be reused. |

```mermaid
sequenceDiagram
    participant R as Reader
    participant B as Shared buffer
    participant W as Writer
    R->>B: IDLE → READER_READY
    R->>W: Register buffer
    W->>B: READER_READY → WRITER_READY
    loop Each non-final fragment
        W->>B: Write bytes and length; publish CHUNK_AVAILABLE
        R->>B: Consume bytes; acknowledge READER_READY
    end
    W->>B: Write final bytes and length; publish FINAL_CHUNK_AVAILABLE
    R->>B: Finish decoder; acknowledge FINAL_CHUNK_CONSUMED
    W->>B: Clear length; publish IDLE
    Note over R,W: Both operations can finish; reader may start another transfer
```

All state accesses use Atomics. State transitions use compare-and-exchange to
avoid overwriting an unexpected or aborted state. Every published transition
notifies waiters, but every waiter independently reloads the state in a loop.
`Atomics.wait` returning `ok` means that a notification occurred; it does not mean
that data is available. A `not-equal` result or timeout likewise requires checking
the current state. F3's shared lifecycle state is checked throughout these waits;
the 100 ms polling interval detects transport failure and does not impose a
deadline on a healthy transfer.

The reader can observe a published chunk immediately after registration if the
writer advances quickly. It must never interpret `WRITER_READY` as available
data. The final `FINAL_CHUNK_CONSUMED → IDLE` acknowledgement prevents the next
registration from racing an unfinished writer. Neither participant returns
before its side of that final handoff is complete.

## Generator contract

An encoder initially yields `undefined` to receive the reusable payload buffer.
Each subsequent `next(payload)` can yield a `Uint8Array`, yield an explicit byte
count for the prefix already written into `payload`, or yield `undefined` to
publish the whole supplied buffer. It returns its final `Uint8Array` or byte
count. Numeric counts must be integers in `[0, payload.byteLength]`; a shorter
in-place chunk can alternatively use `payload.subarray(0, length)`. Final
completion requires an explicit chunk or count; an empty final array or count
zero is valid. In-place prefixes are published without a redundant payload copy.

Each yield's fragments are non-final even when that yield fits entirely in one
payload. Only the last fragment of the generator's final return receives final
signaling. Every fragment is acknowledged before the writer resumes the
generator or reuses its supplied buffer. This is essential for encoders that
fill the same destination repeatedly.

A decoder initially yields to receive data. Each subsequent call receives a
borrowed view of the current bytes. It must consume or copy that view before
yielding again, because acknowledging it permits overwrite. It may return its
result upon receiving the final chunk, or yield once more and finish when passed
`undefined` as end-of-input. Completion before a non-final chunk, or continued
yielding after end-of-input, is a protocol error. Decoder results can be arbitrary
values, not just strings.

Entry/final state checks and local operation guards reject unprepared, duplicate,
or reentrant operations. Protocol and codec exceptions publish `ABORTED` and
notify the peer, preventing a codec failure from stranding the other endpoint.
The RPC layer additionally propagates its transport lifecycle failure.

## UTF-8 codecs

`makeTextEncoder` uses `TextEncoder.encodeInto` to fill the destination supplied
on each resume and yields or returns the explicit number of bytes written. It
does not allocate an encoded byte array for the entire string. The encoder
advances by `read` UTF-16 code units, preserving surrogate pairs and encoding
whole code points. Lone surrogates follow the standard `TextEncoder` behavior
and become U+FFFD replacement characters.

An empty string completes with byte count zero. For nonempty remaining input,
zero progress throws a capacity error rather than yielding indefinitely. A
destination needs enough room for the next code point: one byte for ASCII,
two or three for other BMP characters, and four for supplementary characters.
Thus a four-byte payload accommodates any encoding unit; smaller payloads can
still transport text whose units fit. If a later code point does not fit after
earlier chunks were sent, the transfer aborts instead of returning partial text.

`makeTextDecoder` streams chunks through a fatal UTF-8 decoder and flushes it at
end-of-input. Malformed bytes, overlong encodings, encoded surrogates, out-of-range
code points, and incomplete final sequences fail instead of being replaced or
dropped. A leading U+FEFF is preserved as string data. The input-line pipeline
also decodes complete buffer lines strictly, including its final unterminated
line, so corrupt wire bytes cannot become replacement characters before JSON
parsing or the shared-memory transfer.

## Stale response-ID investigation

The reported `Expected id 16519, got 16518` can be reproduced with the historical
one-shot read: leave reply `16518` in the payload, publish `WRITER_READY`, then
notify the reader without changing that state. A reader that assumes any wakeup
means data is ready decodes the old payload before reply `16519` is published.
This is a concrete mechanism for that exact symptom; the original follower run
alone does not establish which interleaving occurred there.

F3 introduced state-rechecking wait loops for failure handling. F4 preserves and
tests that protection explicitly, adds state/length assertions and a complete
final handshake, and separately repairs premature final signaling for yielding
encoders. The stale-ID regression coordinates real worker threads and forces
repeated readiness notifications before allowing the new reply to be published.
A second regression reuses both endpoints and a four-byte payload for 200
successive replies, including adjacent IDs `16518` and `16519`. These are
deterministic correctness tests rather than a follower soak or performance
benchmark.
