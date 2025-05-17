# BundleStore

The `kernelStorage.bundleStore` sub-store manages code bundles. These can be used to hold vat-worker supervisor code (e.g. the [`@endo/lockdown`](https://github.com/endojs/endo/tree/master/packages/lockdown) bundle, or the [`@agoric/swingset-xsnap-supervisor` package](../../swingset-xsnap-supervisor), which incorporates liveslots), or the initial vat code bundles (for both kernel-defined bundles like vat-comms or vat-timer, or for application-defined bundles like vat-zoe or the ZCF code). It can also hold bundles that will be loaded later by userspace vat code, such as contract bundles.

Each bundle held by the bundleStore is identified by a secure BundleID, which contains a format version integer and a hash, with a format like `b0-123abc456def...` or `b1-789ghi012...`. This contains enough information to securely define the behavior of the code inside the bundle, and to identify the tools needed to load/evaluate it.

The bundleStore provides a simple add/get/remove API to the kernel. The kernel adds its own bundles during initialization, and provides the host application with an API to load additional ones in later. The kernel code that creates new vats will read bundles from the bundleStore when necessary, as vats are created. Userspace can get access to "BundleCap" objects that represent bundles, to keep the large bundle blobs out of RAM as much as possible.

## Data Model

Bundles are actually JavaScript objects: records of at least `{ moduleFormat }`, plus some format-specific fields like `endoZipBase64` and `endoZipBase64Sha512`. They are created by the [`@endo/bundle-source`](https://github.com/endojs/endo/tree/master/packages/bundle-source) package. Many are consumed by [`@endo/import-bundle`](https://github.com/endojs/endo/tree/master/packages/import-bundle), but the `b0-` format bundles can be loaded with some simple string manipulation and a call to `eval()` (which is how supervisor bundles are injected into new vat workers, before `@endo/import-bundle` is available).

The bundleStore database treats each bundle as BundleID and a blob of contents. The SQLite `bundles` table is just `(bundleID TEXT, bundle BLOB)`. The bundleStore knows about each `moduleFormat` and how to extract the meaningful data and compress it into a blob, and how to produce the Bundle object during retrieval.

The bundleStore also knows about the BundleID computation rules. The `addBundle()` API will verify that the contents match the ID, however it currently relies upon the caller to verify e.g. that the bundle does not contain any unexpected properties. The `importSwingStore()` API performs more extensive validation, to prevent corruption during the export+import process.

The kernel is expected to keep track of which bundles are needed and when (with reference counts), and to not delete a bundle unless it is really unneeded. Currently, this means all bundles are retained forever.

Unlike the `snapStore`, there is no notion of pruning bundles: either the bundle is present (with all its data), or there is no record of the BundleID at all.

## Export Model

Each bundle gets a single export-data entry, whose name is `bundle.${bundleID}`, and whose value is just `${bundleID}`. Each bundle also gets a single export artifact, whose name is `bundle.${bundleID}`, and whose contents are the compressed BLOB from the database (from which a Bundle record can be reconstructed).

## Slow Deletion

Since bundles are not owned by vats, there is nothing to delete when a vat is terminated. So unlike `transcriptStore` and `snapStore`, there is no concept of "slow deletion", and no APIs to support it.

When a bundle is deleted by `bundleStore.deleteBundle()`, its export-data item is deleted immediately, and subsequent exports will omit the corresponding artifact.

