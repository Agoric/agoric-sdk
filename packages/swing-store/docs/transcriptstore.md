# TranscriptStore

The `kernelStorage.transcriptStore` sub-store tracks vat delivery transcripts, through which the kernel can provide orthogonal persistence of JavaScript runtime environments (vats).

Each vat is a JavaScript runtime environment, initialized by evaluating some starting code bundle, and then fed a series of deliveries. Each delivery may provoke some number of syscalls back to the kernel, with each get some response data. The delivery finishes with a "delivery result".

For each delivery, this data (delivery, syscall/response pairs, delivery-result) is serialized and stored in a single "transcript item". Each item is indexed by an incrementing "delivery number" (`deliveryNum`).

When a vat worker is brought online, the kernel retrieves these transcript items from the transcriptStore and replays them, by performing the delivery and responding to the syscalls, even though the syscall responses are pulled from the transcript instead of causing actual execution. The kernel asserts that the new worker behaves exactly like the original one did. For xsnap workers, the kernel doesn't actually have to replay the *entire* transcript, because it can start from a heap snapshot (stored in the adjoining [`snapStore`](./snapstore.md)). So generally it only needs to replay a single span.

## Data Model

Vat lifetimes are broken up into "incarnations", separated by upgrade events. Within each incarnation, the transcript is broken up into "spans", separated by heap-snapshot cycles. To end a span, the kernel records the worker's heap snapshot, then "closes" the old span, and opens a new one.

This results in a single open or "current" span for each active vat, and a series of historical spans. For operational purposes, we only care about the current span. But to support some potential deep-replay needs, the transcriptStore can retain data about earlier spans.

The SQLite database has one table that tracks transcript spans, named `transcriptSpans`. All vatIDs and incarnations are stored in the same table, whose schema is `(vatID TEXT, startPos INTEGER, endPos INTEGER, hash TEXT, isCurrent INTEGER, incarnation INTEGER)`. `startPos` and `endPos` define a zero-based range over the sequence of all deliveries into a vat (the former inclusive and the latter exclusive, such that e.g. `startPos=0` and `endPos=3` would encompass the first three deliveries, with positions 0, 1, and 2).

A separate table named `transcriptItems` tracks the items themselves, with a schema of `(vatID TEXT, position INTEGER, item TEXT, incarnation INTEGER)`. This table has one row per transcript item, each of which is "owned" by a single span with matching values for `vatID` and `incarnation` and having `startPos <= position` and `endPos > position`. Each span owns multiple items (typically 200, but it depends upon how frequently the kernel rolls over new spans).

In the future, historical spans may be compressed, and their item rows replaced with a single compressed blob in the span record. This would reduce the space needed without actually pruning the data.

## Retention / Pruning

If the current swingstore was opened with the `keepTranscripts = false` option, then the transcriptStore will "prune" each span as soon as it becomes historical. Pruned spans will still have a span record, with a hash, to enable safely-validated restoration of the transcript items later, if necessary. However their item records will be deleted, to save space.

When `keepTranscripts = true`, all span items are retained.

Pruned spans are not available for export artifacts, of course, because the data is missing. However the span *hashes* are still included in the export-data, to support safe validation. You can start with a pruned swingstore, produce an export dataset, import that dataset into a new swingstore, and the new swingstore will be just as capable of validating replacement span records as the original was.

## Export Model

Every transcript span, both current and historic, gets an export-data record. The record name is different for the two types of spans.

Historical spans, which are "closed" and no longer growing, use a record name of `transcript.${vatID}.${startPos}.${endPos}`, where `startPos` is the delivery number of the first delivery included in the span and `endPos` is the the delivery number of the first delivery included in the **next** span (i.e., the former is an inclusive lower bound and the latter is an exclusive upper bound).
The value is a JSON-serialized record of `{ vatID, startPos, endPos, hash, isCurrent, incarnation }` (where `isCurrent = 0`).

The current span, if any, uses a record name of `transcript.${vatID}.current`, and has the same value as historical spans (except `isCurrent = 1`). Current spans are growing: new transcript items are added as more deliveries are made, until the span is closed off (becomes historical) and replaced with a new current span. There is at most one current span per vatID.

The available export *artifacts* will depend upon the export mode, and upon the swingstore's `keepTranscripts` setting. Each export artifact corresponds to a single span, and the artifact names are always `transcript.${vatID}.${startPos}.${endPos}` (for both historical and current spans).

In the most-minimal `operational` mode, the export includes one artifact for each active (non-terminated) vat: just the current span. If `keepTranscripts` is not true, these will be the only available artifacts anyways.

The `replay` mode includes all spans for each vat's current incarnation, but omits spans from earlier incarnations. The `archival` mode includes all spans from all incarnations.

The `debug` mode includes all available spans, even for terminated vats. For the non-`debug` modes, terminated vats will not provide export-data or artifacts.

## Slow Deletion

As soon as a vat is terminated, the kernel will call `transcriptStore.stopUsingTranscript()`.  The DB is updated to clear the `isCurrent` flag of the latest span, leaving no rows with `isCurrent = 1`. This immediately makes the vat non-loadable by the kernel.

This also removes the `transcript.${vatID}.current` export-data record, and replaces it with a `transcript.${vatID}.${startPos}` one, effectively making the span historical. This change (one deletion, one addition) is added to the export-data callback queue, so the host-app can learn about it after the next commit, and any subsequent `getExportData()` calls will see the replacement record, instead of a `.current` record.

At this point, all non-`debug` swing-store exports after this point will omit any artifacts for the vat, but they will still include export-data records (hashes) for all spans, all of which look historical. (Deleting all the span records, and their corresponding export-data records, is too much work to do in a single step).

Later, as the kernel performs cleanup work for this vatID, the `transcriptStore.deleteVatTranscripts(budget)` cleanup call will delete one span row per `budget`, along with all related item rows (typically 200). Each span deleted will also remove one export-data record (which feeds the callback queue, as well as affecting the full `getExportData()` results).

Eventually, the transcriptStore runs out of rows to delete, and `deleteVatTranscripts(budget)` returns `{ done: true }`, so the kernel can finally rest.

### TranscriptStore Vat Lifetime

Unlike the [SnapStore](./snapstore.md), the TranscriptStore *does* have an explicit call to be made when a vat is first created: `transcriptStore.initTranscript(vatID)`. Also unlike SnapStore, TranscriptStore (normally) always has an `isCurrent = 1` span for each vat (it might just be empty of items, immediately after the span rolls over).

When a vat is terminated, the kernel should first call `transcriptStore.stopUsingTranscript(vatID)`. This will mark the single current span as `isCurrent = 0`. The kernel must not attempt to read, add, or rollover spans or items while in this state. While in this state, exports (export for `mode = debug`) will not emit artifacts for this VatID: export-data records will still exist for all spans, as these must be deleted slowly, however there will be no associated artifacts or artifact names.

Then, the kernel should either call `transcriptStore.deleteVatTranscripts(vatID)` exactly once, or it should call `transcriptStore.deleteVatTranscripts(vatID, budget)` until it returns `{ done: true }`.

As with snapshots, the `stopUsingTranscript()` is a non-mandatory performance improvement. If omitted, exports will continue to include (many) span artifacts for this vat until the first call to `deleteVatTranscripts()` removes the one `isCurrent = 1` span (since spans are deleted most-recent-first). After that point, exports will stop including any artifacts for the vatID. `stopUsingTranscript()` is idempotent, and extra calls will leave the DB unchanged.

The kernel must keep calling `deleteVatTranscripts(vatID, budget)` until the `{ done }` return value is `true`.  As with the SnapStore, it is safe to call it again after that point; the function will keep returning `true`.
