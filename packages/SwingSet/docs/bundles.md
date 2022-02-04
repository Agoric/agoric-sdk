# Code Bundles

The swingset kernel provides tools to install, reference, and evaluate "Code Bundles". Vats can be created from a bundle, and vats can pass around "bundlecaps" to refer to previously-installed bundles. Using bundlecaps is much more efficient than passing the entire (large) bundle object through messages.

## What Is A Bundle?

We write source code in one or more files named "modules", like `foo.js`. These modules will export some number of symbols (functions, etc), and can import symbols from other modules. These modules are organized into "packages".

In a given workspace (e.g. a Git checkout / working tree), you will have a hierarchy of `node_modules/` directories which contain the packages and modules that can be imported. So when `foo.js` says `import { x } from '../bar.js'`, it will get code from a neighboring file, and when it says `import { y } from 'otherpackage'`, it will get code from somewhere in the `node_modules` directory.

If you point at a single "entry point" module, and chase down all the `import` statements, you'll find some other set of module files. Following the transitive `import` statements leads to a collection of modules and a linkage map which remembers how they are wired together.

A "code bundle" is a data structure that captures the contents of these modules and the linkage map (called a "compartment map"). Bundles are JSON-serializable objects, with one mandatory string property named `moduleFormat`, and other properties that depend on the format. Typically there is exactly one other property, and its value is a very large string (1-2 MB is common). Our bundles use a format that Endo defines, named "EndoZipBase64", in which the "very large string" is a base64-encoded Zip file, which contains one component for the compartment map, plus components for each of the modules it includes.

The `bundleSource()` function takes a filename of the entry point module and returns (a promise for) the code bundle object. It generally needs disk access to find all the imports.

The `importBundle()` function takes a bundle object and evaluates it, returning (a promise for) a "module namespace object", which contains all the exports of the entry-point module. You can think of `importBundle()` as what Node.js effectively does when you run `node ./foo.js`: it does the equivalent of `bundleSource()` followed by an immediate `importBundle()`, ignoring the exported symbols but executing everything in `foo.js` as a side-effect.

Bundles are interesting because they can be serialized and sent to a remote system. They can be saved in a database and instantiated (evaluated/imported) later, possibly multiple times.

## BundleIDs

We define the "bundle ID" as a hash of the bundle's compartment map file, specifically the fixed string `b1-` followed by the lowercase hex encoding of the SHA512 hash of the compartment map file. The compartment map includes hashes of all the modules included in the bundle, and the validation process ensures that the bundle contains exactly the expected set of modules. So the bundle ID is a strong identifier of the contents of the bundle, which is not sensitive to the order of the zipfile contents.

A bundle might be assembled piecemeal. If I want to give you a bundle, and you already have a number of similar bundles, we can compare the modules in each and figure out the ones my bundle needs but you don't have yet. Then I can send you just the compartment map and the missing modules, and you can reassemble a functionally identical bundle. The bundleID will be the same, the imported behavior will be the same, but the zipfile itself might be slightly different. This lets us minimize the amount of data transmitted and stored.

## How Swingset Uses Bundles

The swingset kernel maintains a "bundle table" in the kernel database. Bundles can be installed here, indexed by their bundleID, and retrieved for various purposes:

* all swingset vats, both static and dynamic, start from a bundle
  * in these bundles, the entry point module exports a function named `buildRootObject`
* through a special `devices.bundle`, vat code can exchange a bundleID for a "bundlecap", which is an ocap-friendly way to refer to a bundle
* the bundlecap can be used with `vatAdminService~.createVat()` to make a new dynamic vat
* userspace can use `D(bundlecap).getBundle()` to fetch the bundle itself, for use with `importBundle()` that does not create an entire new vat
  * the Zoe "ZCF" facet uses this to load contract code within an existing vat
  * this could also be used as part of an in-vat upgrade process, to load new behavior
* each vat also has a "liveslots" layer, defined by a bundle
  * the liveslots bundleID is recorded separately for each vat, so liveslots can be upgraded (for new vats) without affecting the behavior of existing ones
* swingset devices are defined by bundles that are stored in the bundle table
* the kernel source code itself is stored in a bundle, to make it easier to switch from one version of the kernel to another at a pre-determined time

## Bundle Installation Through Config

When defining a static vat in the Swingset `config.vats` object, the filename provided as `sourceSpec` is turned into a bundle, the bundle is installed into the bundle table, and resulting bundleID is stored in the vat's database record. When the static vat is launched, the DB record provides the bundleID, and the bundle is loaded and evaluated in a new vat worker.

The `config.bundles` object maps names to a bundle specification. These bundles are installed as above, and then a special "named bundles" table is updated with the name-to-bundleID mapping. These names are available to `D(devices.bundle).getNamedBundleCap(name) -> bundlecap`. For example, the chain's "core bootstrap" code will use this to define bundles for the core vats (Zoe, etc), and create dynamic vats at bootstrap time from them. It will also provide Zoe with the bundlecap for ZCF this way, so Zoe can later create dynamic ZCF vats. `E(vatAdminService).createVatByName(bundleName)` will continue to be supported until core-bootstrap is updated to retrieve bundlecaps, after which vat-admin will drop `createVatByName` and only support `createVat(bundlecap)`.

The `initializeSwingset()` function, called when the host application is first configured, creates bundles for built-in vats and devices (timer, vatAdmin, mailbox), as well as liveslots and the kernel, and installs them into the table as well. Internally, the kernel remembers the bundleID of each one for later use.

## Bundle Installation at Runtime

Once the kernel is up and running, new bundles can be installed with the `controller.validateAndInstallBundle()` interface. This accepts a bundle and an optional alleged bundleID. It performs validity checks: if the ID is provided but does not match the compartment map, or if (TODO) the bundle contents do not match the compartment map, or if (TODO) the contents do not parse as JavaScript modules, then it will throw. If everything looks good, it will install the bundle into the table and return the computed bundleID.

Once the bundle is installed, the external caller can send a vat-level message with the bundleID to some vat within the kernel. The receiving vat can then do `D(devices.bundle).getBundleCap(bundleID) -> bundlecap` to get a handle from which vats can be created.

A future version of this interface will expose enough information to install individual modules first, and then "install" a bundle from just the compartment map contents (after checking that all the required modules are already present).

By moving bundle installation into a separate external interface, vat-level messages can remain small. Currently the only place the full bundle will appear is in a vat transcript, in the results of the syscall that implements `D(bundlecap).getBundle()`, when userspace needs to do an `importBundle()` directly, and we hope to remove even that copy in the future.

## Bundlecaps

As suggested above, userspace works with a "bundlecap", which is a passable object (actually a device node) that represents the bundle. This can be passed through eventual-sends from one vat to another and stored in collections (and virtual objects). Internally, it wraps the bundleID.

The full set of things you can do with a bundlecap are:

* `D(bundlecap).getBundleID() -> string`: to get the bundleID
* `D(bundlecap).getBundle() -> bundle object`: if you really need the full bundle, i.e. for `importBundle()`
* `E(vatAdminService).createVat(bundlecap)`: create a new dynamic vat from the bundle

## Kernel Internals

The kvStore has a subset of the key space reserved for holding bundles (mapping bundleID to the JSON-encoded bundle). Another keyspace holds mapping from bundle name to bundleID for the named bundles. These are accessed through `kernelKeeper` methods.

The "bundle device" (aka `devices.bundle`) has a root device node with an API to create bundlecaps:
* `D(devices.bundle).getBundleCap(bundleID) -> bundlecap`
* `D(devices.bundle).getNamedBundleCap(bundleName) -> bundlecap`

Bundlecaps are new device nodes created by the bundle device. Internally, this device remembers the mapping from bundleID to the device node ID (`dref`), and vice versa, in a pair of vatstore state entries. This mapping is not held in RAM: the state entries are looked up on each call to `getBundleID`/etc. The device can also access the kernelKeeper APIs to convert bundleIDs into full bundles, if requested.

The vatAdmin vat's `createVat` method accepts bundlecaps (or full bundles, for now). The vatAdmin device (which is wrapped tightly by vatAdminVat and not exposed to anyone else) accepts bundleIDs. VatAdminDevice translates bundlecaps into bundleIDs before talking to the device.

`controller.validateAndInstallBundle(bundle, optionalAllegedBundleID)` performs validity checks, installs the bundle, and returns the computed bundleID. It uses `kernel.installBundle(bundleID, bundle)` internally, which uses uses `kernelKeeper` to store the bundle, and does not perform validation.



## Determinism

Bundle installation is a transactional event: it must happen, and be committed, before the bundle is available. `D(devices.bundle).getBundleCap(bundleID)` will fail (consistently) if the bundle was not already installed. Host applications (like a chain) should perform `validateAndInstallBundle()` from within a transaction, so all validators maintain consensus about whether the bundle is installed or not.

But once a bundlecap is obtained, the corresponding bundle is guaranteed to be available. We do not yet have GC for bundles, but once we do, each copy of the bundlecap will establish a reference count. As long as any bundlecap is still held, the bundle will be held too. Bundles will be deleted at some point after the last bundlecap is gone. (We need a story for what keeps the bundle alive between the external `controller.validateAndInstallBundle()` and some vat getting a bundlecap, but that interval is not expected to be very long, so we might just use explicit GC actions that we don't run very often).
