# KVStore

The `kernelStorage.kvStore` sub-store manages a table of arbitrary key-value (string-to-string) pairs. It provides the usual get/set/has/delete APIs, plus a `getNextKey` call to support lexicographic iteration.

There are three separate sections of the namespace. The normal one is the "consensus" section.  Each value written here will be given an export-data row, and incorporated into the "crankhash" (described below).

The second is "local", and includes any key which is prefixed with `local.`. These keys are *not* given export-data rows, nor are they included in the crankhash.

The third is "host", and includes any key which is prefixed with `host.`. This is not available to `kernelStorage.kvStore` at all: it is only accessed by methods on `hostStorage.kvStore` (the `kernelStorage` methods will throw an error if given a key like `host.foo`, and the `hostStorage` methods will throw *unless* given a key like `host.foo`). These are also excluded from export-data and the crankhash. Host keys are reserved for the host application, and are generally used to keep track of things like which block has been executed, to manage consistency between a separate host database (eg IAVL) and the swingstore. The host can record "I told the kernel to execute the contents of block 56" into `hostStorage.kvStore`, and then do `hostStorage.commit()`, and then it can record "I processed the rest of block 56" into is own DB, and then commit its own DB. If, upon startup, it observes a discrepancy between the `hostStorage.kvStore` record and its own DB, it knows it got interrupted between these two commit points, which can trigger recovery code.

Any key which doesn't start with `local.` or `host.` is part of the "consensus" section.

## CrankHash and ActivityHash

Swingset kernels are frequently run in a consensus mode, where multiple instances of the kernel (on different machines) are expected to execute the same deliveries in lock-step. In this mode, every kernel is expected to do exactly the same computation, and any divergence indicates a failure (or attempt at malice). We want to detect such variations quickly, so the diverging/failing member can "fall out of consensus" promptly.

The swingstore hashes all changes to the "consensus" portion of the kvStore into the "crank hash". This hash covers every change since the beginning of the current crank, and the kernel logs the result at the end of each crank, at which point the crankhash is reset.

Each crank also updates a value called the "activity hash", by hashing the previous activityhash and the latest crankhash together. This records a chain of changes, and is logged at the end of each crank too.

The host application can record the activityhash into its own consensus-tracking database (eg IAVL) at the end of each kernel run, to ensure that any internal divergence of swingset behavior is escalated to a proper consensus failure. Without this, one instance of the kernel might "think differently" than the others, but still "act" the same (in terms of IO or externally-visible messages) without triggering a failure, which would be a lurking problem.

Logging both the crankhash and the activityhash improves our ability to diagnose consensus failures. By comparing logs between a "good" machine and a "bad" (diverging) one, we can quickly determine which crank caused the problem, and usually compare slogfile delivery/syscall records to narrow the divergence down to a specific syscall.

kvStore changes are also recorded by the export-data, but these are too voluminous to be logged, and do not capture multiple changes to the same key. And not all host applications use exports, so there might not be anything watching export data.

## Data Model

The kvStore holds a simple string-to-string key/value store. The SQLite schema for the `kvStore` table is simply `(key TEXT, value TEXT)`.

## Export Model

To ensure that every key/value pair is correctly validatable, *all* in-consensus kvStore rows get their own export-data item. The name is just `kv.${key}`, and the value is just the value. `kvStore.delete(key)` will delete the export-data item. There are no artifacts.

These make up the vast majority of the export-data items, both by count and by "churn" (the number of export-data items changed in a single crank). In the future, we would prefer to keep the kvStore in some sort of Merkle-tree data structure, and emit only a handful of export-data rows that contain hashes (perhaps just a single root hash). In this approach, the actual data would be exported in one or more artifacts. However, our SQLite backend does not provide the same kind of automatic Merkleization as IAVL, and only holds a single version of data at a time, making this impractical.
