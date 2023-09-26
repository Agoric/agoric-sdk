# SwingStore Data Model

The "SwingStore" provides a database to hold SwingSet kernel state, with an API crafted to help both the kernel and the host application mutate, commit, export, and import this state.

The state is broken up into several pieces, or "stores":

* `bundleStore`: a string-keyed Bundle-value table, holding source bundles which can be evaluated by `importBundle` to create vats, or new Compartments within a vat
* `transcriptStore`: records a linear sequence of deliveries and syscalls (with results), collectively known as "transcript entries", for each vat
* `snapStore`: records one or more XS heap snapshots for each vat, to rebuild a worker more efficiently than replaying all transcript entries from the beginning
* `kvStore`: a string-keyed string-valued table, which holds everything else. Currently, this holds each vat's c-list and vatstore data, as well as the kernel-wide object and promise tables, and run-queues.

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
