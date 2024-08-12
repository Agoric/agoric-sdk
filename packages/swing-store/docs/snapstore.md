# SnapStore

The `kernelStorage.snapStore` sub-store tracks vat heap snapshots. These blobs capture the state of an XS JavaScript engine, between deliveries, to speed up replay-based persistence. The kernel can start a vat worker from a recent heap snapshot, and then it only needs to replay a handful of transcript items (deliveries), instead of replaying every delivery since the beginning of the incarnation.

The XS / [`xsnap`](../../xsnap) engine defines the heap snapshot format. It consists of a large table of "slots", which are linked together to form JavaScript objects, strings, Maps, functions, etc. The snapshot also includes "chunks" for large data fields (like strings and BigInts), a stack, and some other supporting tables. The snapStore doesn't care about any of the internal details: it just gets a big blob of bytes.

## Data Model

Each snapshot is compressed and stored in the SQLite row as a BLOB. The snapStore has a single table named `snapshots`, with a schema of `(vatID TEXT, snapPos INTEGER, inUse INTEGER, hash TEXT, uncompressedSize INTEGER, compressedSize INTEGER, compressedSnapshot BLOB)`.

The kernel has a scheduler which decides when to take a heap snapshot for each vat. There is a tradeoff between the immediate cost of creating the snapshot, versus the expected future savings of having a shorter transcript to replay. More frequent snapshots save time later, at the cost of time spent now.

The kernel currently uses a [very simple scheduler](../../SwingSet/src/kernel/vat-warehouse.js), which takes a snapshot every `snapshotInterval` deliveries (e.g. 200), plus an extra one a few deliveries (`snapshotInitial`) into the new incarnation, to avoid replaying expensive contract startup code. The [SwingSet configuration documentation](../../SwingSet/docs/configuration.md) has the details.

However, the swingstore is unaware of the kernel's scheduling policy. Every once in a while, the kernel tells the snapStore about a new snapshot, and the snapStore updates its data.

Like the [transcriptStore](./transcriptstore.md), the snapStore retains a hash of older records, even after it prunes the snapshot data itself. There is at most one `inUse = 1` record for each vatID, and it will always have the highest `snapPos` value. When a particular vatID's active snapshot is replaced, the SQLite table row is updated to clear the `inUse` flag (i.e. set it to NULL). By default, the `compressedSnapshot` field is also set to NULL, removing the large data blob, but there is an option (`keepSnapshots: true`) to retain the full contents of all snapshots, even the ones that are no longer in use.

## Export Model

Each snapshot, both current and historic, gets an export-data entry. The name is `snapshot.${vatID}.${position}`, where `position` is the latest delivery (eg highest delivery number) that was included in the heap state captured by the snapshot. The value is a JSON-serialized record of `{ vatID, snapPos, hash, inUse }`.

If there is a "current" snapshot, there will be one additional export-data record, whose name is `snapshot.${vatID}.current`, and whose value is `snapshot.${vatID}.${position}`. This value is the same as the name of the latest export-data record, and is meant as a convenient pointer to find that latest snapshot.

The export *artifacts* will generally only include the current snapshot for each vat. Only the `debug` mode will include historical snapshots (and only if the swingstore was retaining them in the first place).

## Slow Deletion

As soon as a vat is terminated, the kernel will call `snapStore.stopUsingLastSnapshot()`. The DB is updated to clear the `inUse` flag of the latest snapshot, leaving no rows with `inUse = 1`. This immediately makes the vat non-loadable by the kernel. The snapshot data itself is deleted (unless `keepSnapshots: true`).

This also modifies the latest `snapshot.${vatID}.${snapPos}` export-data record, to change `inUse` to 0, and removes the `snapshot.${vatID}.current` record. The modification and deletion are added to the export-data callback queue, so the host-app can learn about them after the next commit. Any subsequent `getExportData()` calls will observe the changes.

As a result, all non-`debug` swing-store exports after this point will omit any artifacts for the snapshot blob, but they will still include export-data records (hashes) for all snapshots. (Deleting all the export-data records is too much work to do in a single step, so it is spread out over time).

Later, as the kernel performs cleanup work for this vatID, the cleanup call will delete DB rows (one per `budget`). Each row deleted will also remove one export-data record, which feeds the callback queue, as well as affecting the full `getExportData()` results.

Eventually, the snapStore runs out of rows to delete, and `deleteVatSnapshots(budget)` returns `{ done: true }`, so the kernel can finally rest.

### SnapStore Vat Lifetime

The SnapStore doesn't provide an explicit API to call when a vat is first created. The kernel just calls `saveSnapshot()` for both the first and all subsequent snapshots. Each `saveSnapshot()` marks the previous snapshot as unused, so there is at most one `inUse = 1` snapshot at any time. There will be zero in-use snapshots just after each incarnation starts, until enough deliveries have been made to trigger the first snapshot.

When terminating a vat, the kernel should first call `snapStore.stopUsingLastSnapshot(vatID)`, the same call it would make at the end of an incarnation, to indicate that we're no longer using the last snapshot. This results in zero in-use snapshots.

Then, the kernel must either call `snapStore.deleteVatSnapshots(vatID)` or `deleteVatSnapshots(vatID, Infinity)` to delete everything at once, or make a series of calls (spread out over time/blocks) to `snapStore.deleteVatSnapshots(vatID, budget)`. Each will return `{ done, cleanups }`, which can be used to manage the rate-limiting and know when the process is finished.

The `stopUsingLastSnapshot()` is a performance improvement, but is not mandatory. If omitted, exports will continue to include the vat's snapshot artifacts until the first call to `deleteVatSnapshots()`, after which they will go away. Snapshots are deleted in descending `snapPos` order, so the first call will delete the only `inUse = 1` snapshot, after which exports will omit all artifacts for the vatID. `stopUsingLastSnapshot()` is idempotent, and extra calls will leave the DB unchanged.

The kernel must keep calling `deleteVatSnapshots(vatID, budget)` until the `{ done }` return value is `true`. It is safe to call it again after that point; the function will keep returning `true`. But note, this costs one DB txn, so it may be cheaper for the kernel to somehow remember that we've reached the end.
