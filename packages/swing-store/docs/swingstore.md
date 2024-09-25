# The SwingStore

The "SwingStore" provides a database to hold SwingSet kernel state, with an API crafted to help both the kernel and the host application mutate, commit, export, and import this state.

The entire durable state of the kernel lives in the SwingStore: it does not use any other files or databases, and the only commit point is in `hostStorage.commit()`. Careful host applications can use this to avoid "hangover inconsistency", by storing all device output messages in the same database, and only releasing them once the kernel changes have been committed.

In theory, an alternate implementation of this API could be provided with e.g. a different backend database, such as the host application's own native database (eg IAVL, for cosmos-sdk -based apps). This could simplify the atomicity domains by using just one database instead of two. This must be balanced against performance tradeoffs: swing-store takes advantage of SQL's indexing and iteration abilities, which might not be present in the other database.

## Creating and Opening a SwingStore


`initSwingStore(dirPath, options)` will create a new swingstore in the given directory, which will be created if it doesn't already exist. The entire directory is reserved for the swingstore: the host application should not put any other files there. The swingstore library will populated it with the SQLite DB's backing files: `swingstore.sqlite`, `swingstore.sqlite-wal`, and `swingstore.sqlite-shm`. If called on a directory that already contains a database, the DB will be erased first.

`openSwingStore(dirPath, options)` does the same, but will not erase a pre-existing DB. In general, use `initSwingStore` for the initial creation of the DB, and `openSwingStore` for all subsequent access.

Both calls return a record with `{ hostStorage, kernelStorage }`, along with some additional facets for testing and debugging. `dirPath` can be null to use a ephemeral (in-memory) DB, which is only useful for unit tests.

## HostStorage

The `hostStorage` facet is reserved for the host application. It is mostly used to manage commit points for the application.

The host is responsible for calling `hostStorage.commit()` when it is done with kernel execution. This causes a SQLite `COMMIT` of the underlying database. It should perform this commit before it releases any device output messages. This facet is the only one with a `commit()` method: the kernel is explicitly unable to commit its own changes to the underlying SQLite database, because the kernel does not know anything about the host's application lifecycle or input/output activity, so it cannot know what qualifies as a safe commit point.

If, for some reason, the host wants to abandon execution, it can call `hostStorage.close()`, which will close the swingstore without committing any changes. This is not normally useful: the kernel must be abandoned at this point too, so most of the time the host application should just exit entirely.

`hostStorage.kvStore` is also available to let the host add items to a separate portion of the kvStore, using keys which start with a `host.` prefix. It can use this to coordinate with a separately-committed host database (e.g. to remember how much work has been given to the kernel, and how much has been successfully executed). This portion of the kvStore is unreachable by the kernel.

`hostStorage.repairMetadata()` was used to repair a historical flaw in the database format, and is not needed by new installations.

## KernelStorage

The host application is supposed to deliver the `kernelStorage` facet to the kernel, by passing it into `initializeSwingset()`, `upgradeSwingset()`, and `buildVatController()`. The host application should not use `kernelStorage` itself.

The kernel receives a facet named `kernelStorage`, from which it can access four sub-stores:

* [`bundleStore`](./bundlestore.md): a string-keyed Bundle-value table, holding source bundles which can be evaluated by `importBundle` to create vats, or new Compartments within a vat
* [`transcriptStore`](./transcriptstore.md): records a linear sequence of deliveries and syscalls (with results), collectively known as "transcript entries", for each vat
* [`snapStore`](./snapstore.md): records one or more XS heap snapshots for each vat, to rebuild a worker more efficiently than replaying all transcript entries from the beginning
* [`kvStore`](./kvstore.md): a string-keyed string-valued table, which holds everything else. Currently, this holds each vat's c-list and vatstore data, as well as the kernel-wide object and promise tables, and run-queues.

These pieces operate independently: data in one substore does not affect the operation of the others.

`kernelStorage` also provides access to the "crank" tools. Kernel execution proceeds in a series of steps named "cranks", many of which involve delivering a message to a vat worker. Sometimes these messages cause a failure halfway through the delivery, where it is better to record either complete deliveries or nothing at all. To support this, the kernel can mark the beginning of the crank (by calling `kernelStorage.startCrank()`), and then either discard the changes (`rollbackCrank()`) or accept them (`endCrank()`). The `emitCrankHashes()` method rotates the crankhash and updates the activityhash (see the kvStore documentation for details).

Note that `endCrank()` does *not* perform a SQLite `COMMIT`, as that power is reserved for the host application (through `hostStorage.commit()`). Instead, the kernel only has access to SQLite "savepoints", which are smaller-scale than full transactions.


# SwingStore Data Model


The state is broken up into several pieces, or "sub-stores":


## Incarnations, Spans, Snapshots

The kernel tracks the state of one or more vats. Each vat's execution is split into "incarnations", which are separated by a "vat upgrade" (a call to `E(vatAdminFacet).upgrade(newBundleCap, options)`, see https://github.com/Agoric/agoric-sdk/blob/master/packages/SwingSet/docs/vat-upgrade.md for details). Each incarnation gets a new worker, which erases the heap state and only retains durable vatstore data across the upgrade. Every active vat has a "current incarnation", and zero or more "historic incarnations". Only the current incarnation is instantiated.

Within each incarnation, execution is broken into one or more "spans", with a "current span" and zero or more "historic spans". This breaks up the transcript into corresponding spans.

Each historic span ends with a `save-snapshot` entry which records the creation and saving of an XS heap snapshot. The initial span starts with a `start-worker` entry, while all non-initial spans start with a `load-snapshot` entry. The final span of historic incarnations each end with a `shutdown-worker` entry.

Each `save-snapshot` entry adds a new snapshot to the `snapStore`, so each vat has zero or more snapshots, of which the last one is called the "current" or "in-use" snapshot, and the earlier ones are called "historical snapshots".

(note: the `deliveryNum` counter is scoped to the vat and does not reset at incarnation or span boundaries)

## Artifacts

The import/export process (using `makeSwingStoreExporter` and `importSwingStore`) defines some number of "artifacts" to contain much of the SwingStore data. Each bundle is a separate artifact, as is each heap snapshot. Each transcript span is a separate artifact (an aggregate of the individual transcript entries comprising that span).

During export, the `getArtifactNames()` method provides a list of all available artifacts, while `getArtifact(name)` is used to retrieve the actual data. The import function processes each artifact separately.

## Populated vs Pruned

For normal operation, the kernel does not require historical incarnations, spans, or snapshots. It only needs the ability to reconstruct a worker for the current incarnation of each vat, which means loading the current snapshot (if any), and replaying the contents of the current transcript span.

For this reason, the swingstore must always contain the current transcript span, and the current snapshot (if any), for every vat.

However, to save space, historical spans/snapshots might be pruned, by deleting their contents from the database (but retaining the metadata, which includes a hash of the contents for later validation). Historical snapshots are pruned by default (unless `openSwingStore()` is given an options bag with `keepSnapshots: true`). Historical spans are not currently pruned (the `keepTranscripts` option defaults to `true`), but that may change.

In addition, `importSwingStore()` can be used to create a SwingStore from data exported out of some other SwingStore. The export-then-import process might result in a pruned DB in one of three ways:

* the import-time options might instruct the import process to ignore some of the available data
* the export-time options might have done the same
* the original DB was itself already pruned, so the data was not available in the first place

In the future, a separate SwingStore API will exist to allow previously-pruned artifacts to be repopulated. Every artifact has a metadata record which *is* included in the export (in the `exportData` section, but separate from the kvStore shadow table entries, see [data-export.md](./data-export.md)), regardless of pruning modes, to ensure that this API can check the integrity of these repopulated artifacts. This reduces the reliance set and trust burden of the repopulation process (we can safely use untrusted artifact providers).

When a snapshot is pruned, the `snapshots` SQL table row is modified, replacing its `compressedSnapshot` BLOB with a NULL. The other columns are left alone, especially the `hash` column, which retains the integrity-checking metadata to support a future repopulation.

When a transcript span is pruned, the `transcriptSpans` row is left alone, but the collection of `transcriptItems` rows are deleted. Any span for which all the `transcriptItems` rows are present is said to be "populated", while any span that is missing one or more `transcriptItems` rows is said to be "pruned". (There is no good reason for a span to be only partially pruned, but until we compress historical spans into a single row, in some new table, there remains the possibility of partial pruning).

During import, we create the metadata first (as the export-data is parsed), then later, we fill in the details as the artifacts are read.

Bundles are never pruned, however during import, the `bundles` table will temporarily contain rows whose `bundle` BLOB is NULL.

## Vat Lifetimes

Two sub-stores are keyed by VatID: `transcriptStore` and `snapStore` (the `bundleStore` does not know which vats might know about each bundle, and the `kvStore` entries which relate to a specific vat will have the VatID embedded in the key, so the swing-store doesn't need to know about them).

When the kernel terminates a vat, we want to delete the no-longer-necessary data. However, if the vat had a large number of transcript entries and/or heap snapshots, deleting all this data at the same time might cause excessing CPU or I/O usage (eg thousands of DB queries, or a multi-gigabyte `swingstore.sqlite-wal` file. It might also push a large number of changes into the export-data callbacks, which can cause memory or CPU stall problems in the host application. In the worst case, the entire application could crash.

To limit this usage, and allow the kernel to delete vat state slowly, the swing-store is somewhat more aware of a vat's lifetime than a mere database should be. In particular, we split the shutdown process into two pieces. "Terminating a vat" happens first, and tells the sub-store to hide the vat from exports and from API calls that are meant to find out which vats are available. The kernel should call this exactly once, when the vat is terminated.

The second part is "deletion", and it can happen either all-at-once or in multiple budget-limited calls. Both forms share the same API calls, differing only in their `budget` argument (`undefined` means all-at-once). The deletion API can be called multiple times, with a small budget, and each call will only delete a small portion of the state. They will return a value that indicates when the last bit of state has been deleted, so the kernel can know when to stop calling them.

See [transcriptstore.md](./transcriptstore.md) and [snapstore.md](./snapstore.md) for more details.
