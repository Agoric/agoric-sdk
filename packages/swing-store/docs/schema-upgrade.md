# How SwingStore Upgrades Its Database Schema

Over time, this package will acquire new features, and offer new APIs to the SwingSet kernel. Some of these features will require changes to the underlying SQLite database schema: adding new tables, modifying existing ones, and changing the way some rows are interpreted. And since SwingSet installations are long-lived, the swing-store must accomodate databases created or used by earlier versions.

For example, one feature we're considering is the addition of a `clistStore` component, which would store `(vatID, vref, kref, reachable)` tuples into a new table (with a `CREATE INDEX` on both `vref` and `kref`). This would be simpler, faster, and more space efficient than our current practice of storing c-list entries as pairs of `kvStore` keys.

The older version of `@agoric/swing-store` (e.g. `0.9.1`), will not have `kernelStorage.clistStore`, and it will be used by an older version of the SwingSet kernel (e.g. `0.32.2`). Then we'll release `@agoric/swing-store 0.10.0` that adds the new store, which will be the version in the `dependencies:` of a new kernel version `0.33.0` that knows to use `clistStore.add(vatID, vref, kref, reachable)` instead of encoding `kvStore` keys.

Then consider a SwingSet installation which was first created with kernel `0.32.2`, does some work, and is then rebooted with kernel `0.33.0`. We need the installation to keep working. The new kernel will make `clistStore` calls, which means it must depend on `@agoric/swing-store` at `0.10.0` or higher, which expects the c-list data to be in a new table. But at restart time, that table doesn't exist, and the relevant data is encoded in the `kvStore` table.

This calls for a schema upgrade process. The remainder of this document describes how the swing-store SQLite database is versioned, how schema upgrades are defined, and the control offered to the host application.

## SwingStore Schema Versions

Each database has a specific **version**. This is an integer, starting with "1" for the implicitly-defined schema that was used in `@agoric/swing-store 0.9.1` (the last version before this upgrade process was defined and implemented). Each time we change the schema, we will increment this number. In this document, we'll describe the database or schema as being at "v1" to mean this integer is 1, etc, even though the `v` does not appear in the code.

(In fact, we have two variants of this `v1` schema. `v1a` is created by swing-store 0.9.1, and has a CHECK constraint on the `snapStore` table. `v1b` is created by swing-store `0.9.2-u11.0` (as part of the agoric-sdk `agoric-upgrade-11` tag, which includes [https://github.com/Agoric/agoric-sdk/pull/8075](#8075)), and lacks that CHECK constraint. Because we did not have this upgrade process in place earlier, current installations might have either variant, and they are not distinguished by a `version` integer. We expect that the first upgrade, to version "2", will perform a migration that unifies the two variants, such that a version "2" DB never has the CHECK constraint.)

The `version` integer is stored as the single row of a special table named `version`, in a column also named `version`. If this table or row does not exist, the DB is at version "1".

New releases of `@agoric/swing-store` may or may not increase the schema version. Many new features will not require schema changes, nor will most bugfixes. The package version will follow SemVer rules, but that indicates whether the *caller* (i.e. SwingSet) can use newer package versions without code changes. The schema version is not exposed to the caller.

All versions of the `@agoric/swing-store` package can upgrade all previously released schema versions. The upgrade code can handle multiple steps in a single open (jumping from v1 to v3), although the implementation works by taking one step at a time (v1 to v2, then v2 to v3).

## Application Control of Upgrade

If enabled, schema upgrades occur automatically as part of calling `openSwingStore()`. To enable upgrades, an option must be turned on:

```js
const { hostStorage, kernelStorage } = openSwingStore(dbDir, { upgrade: true });
```

By the time `openSwingStore` returns, the database will have been upgraded to the current schema version. The DB changes needed for this will not have been committed yet: like all swingstore changes, they will only get committed if/when the host application calls `hostStorage.commit()`. This allows the schema upgrade itself to be rolled back if the host application is killed before it reaches the commit point.

If `upgrade: true` is not provided, then `openSwingStore` on an out-of-date database will throw an error. `openSwingStore` on a fully-up-to-date DB will work as usual.

## Schema Upgrade and exportCallback

The [SwingStore "export" feature](./data-export.md) has a mode in which changes to the "export data" are delivered incrementally, as the kernel runs. These export-data key/value (or key/"delete") pairs are delivered to a host-provided `exportCallback` in the options bag. Host applications which support swingstore export will consume this stream and apply the export-data changes to their own database (e.g. the cosmos-sdk IAVL tree).

Schema upgrade may cause changes to the export-data. At the very least, the `version` row is changed. But some upgrades may cause substantial churn, e.g. the hypothetical `clistStore` upgrade would delete two export-data items from the `kvStore` for each c-list entry, and insert one `clistStore` item.

These callbacks will be invoked while `openSwingStore()` runs, so the host application must be prepared for their callback to be executed immediately. SwingStore is allowed to defer invoking the callback as long as it wants, but guarantees that all calls will be made by the time `hostStorage.commit()` returns. In practice, SwingStore will generally deliver the schema-upgrade -related callbacks before `openSwingStore()` returns.

## Import Requires Current Version

The dataset (export-data plus artifacts) created by the export feature is versioned, by virtue of the export-data record that copies the `version` row.

`importSwingStore()` will throw an error if presented with a dataset whose version is older than what the importing code would create. SwingStore is willing to upgrade databases *on disk*, but refuses to upgrade data arriving via import. This means the exporter must use roughly the same `@agoric/swing-store` version as the importer. (This simplifies the import logic, and our main use case would not benefit from more flexibility).

## Implementation Details

Internally, `openSwingStore` starts by creating the `version` table if it does not already exist, then reading the `version` from it (which, of course, will be `undefined` if the table did not previously exist). It stores this in `currentVersion`.

Then, a constant `targetVersion` indicates what version we want to target. This can be set to "1" in our first implementation, which will not cause any upgrades to happen. (Given the #8075 discussion above, this means we're either using `v1a` or `v1b`).

Then, the code opens a new transaction, using `ensureTxn()` (like it does for all mutating APIs). This transaction will remain open until the host calls `hostStorage.commit()`.

Next, each of the sub-component initialization functions (e.g. `initKVStore`, `initBundleStore`, etc) are called with `(db, currentVersion, targetVersion)`.

Each function has a structure like:

```js
function initFoo(db, currentVersion, targetVersion, noteExport) {
  if (!currentVersion) {
    // SQL statements to create tables, etc, to build v1
    currentVersion = 1;
  }
  if (currentVersion === 1) {
    // SQL statements to upgrade from v1 to v2
    currentVersion = 2;
  }
  // ... more upgrade steps, one per defined version
  return currentVersion;
}
```

After this function, a large comment should describe the latest schema, as well as explanations of how each table and row are used.

If the upgrade process causes changes to the export-data, it should call `noteExport()` to report this.

The return value is compared against `targetVersion`: if they differ, an error is thrown, and `openSwingStore` fails. This indicates a coding error, wherein a sub-component was not updated to accomodate the upgrade. Note that most schema changes will modify only one component, so the others will have a stub:

```js
  if (currentVersion === 1) {
    // no changes necessary for this component
    currentVersion = 2;
  }
```

If all components indicate success, `openSwingStore()` proceeds to create API objects for all components, with `makeKVStore()`/etc. The creation of these API objects will not modify the database: the only SQL calls will be in the *functions* returned as part of that API.

### Adding a New Schema Version

When we define a new schema version, swing-store developers need to make the following changes:

* increment `targetVersion`
* add an upgrade clause to each sub-component, either a stub, or one with a full set of `CREATE TABLE` / `ALTER TABLE` commands
  * Note that SQLite's support for `ALTER TABLE` is quite limited: it can add/remove/rename columns, but it cannot change constraints. Significant upgrades will require iterating through all rows of the table and modifying them in place, or copying them into a temporary table and replacing it for the original. See https://www.sqlite.org/lang_altertable.html for options.

In our `clistStore` example (which touches two separate stores during upgrade), the v1-to-v2 clause in our new `initCListStore()` would:
* `CREATE TABLE clists ..`
* iterate through all `kvStore` rows that look like c-list entries
  * read their contents
  * `DELETE FROM` them from `kvStore`
  * call `noteExport()` twice to remove both from the export data
  * `INSERT INTO` a new row in the `clists` table
  * call `noteExport()` once to add the new c-list export-data
* increment `currentVersion`
  
### Unit Testing Upgrades

Each upgrade must include unit tests that demonstrate correct behavior when faced with data from a previous version. There will be helper functions to assist, but the basic process is:

* first, switch to the old branch, write code to populate a SwingStore with relevant data, and run it
* then use `sqlite3 foo.sqlite .dump` to get a list of SQL commands that will rebuild this old-version DB
* then switch to the new branch, and paste the SQL into a new unit test
* build a new in-memory (`:memory:`) DB
* use `db.exec(statements)` to populate it from the old version's state
* use `db.serialize()` to convert that into bytes
* use `openSwingStore(null, { serialized, upgrade: true })` to build+upgrade a SwingStore around that state
* exercise the new SwingSstore, make sure all the old data can be accessed as expected
* use `db = debug.getDatabase()` to perform more precise/raw queries

Note that this process embeds the old ("needs to be upgraded") state directly in the tests, in the form of captured SQL statements, rather than keeping the old *code* around forever. The *upgrade* functions include enough information to reconstruct old versions, in the process of creating the latest version. But there is no API code to manipulate the older tables. So test data must be imported from the past, by cut-and-pasting the old DB state into the tests.
