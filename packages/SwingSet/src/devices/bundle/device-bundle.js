import { assert } from '@endo/errors';
import { buildSerializationTools } from '../lib/deviceTools.js';

/*

The "bundle device" manages code bundles, which can be used to define a new
dynamic vat (vatAdminSvc~.createVat), or can be imported/evaluated from
within a vat (importBundle).

Bundles are 'endoZipBase64' archives, which are basically a string-encoded
ZIP file containing a bunch of importable modules and a single "compartment
map". Each bundle has a unique "bundleID" string, which is the SHA512 hash of
the compartment map file, aka the manifest. This manifest contains hashes of
all the component modules, as well as information about how they link
together, so the bundle's behavior is completely specified by the bundleID
(plus the runtime behavior of the module loader, which includes global
endowments, and potentially "holes" in the module map which will be filled in
by the loader with locally-provided module namespace objects). The order of
the modules in a zip file does not affect the bundleID.

Any two bundles are likely to have a lot of modules in common (shared support
libraries, etc). Modules are individual source files, so they tend to be
small (1-50kB), but bundles tend to be several MB in size.

The goals are:
* install bundles "out of band", through controller.validateAndInstallBundle()
* keep large (multi-MB) bundles out of vat messages and transcripts
* reduce communication bandwidth by uploading shared modules only once
* reduce storage costs by storing shared modules only once

The kernel will provide this device with three endowments:
* hasBundle(bundleID) -> boolean
* getBundle(bundleID) -> string
* getNamedBundleID(name) -> bundleID

The root device node offers two methods to callers:
* D(devices.bundle).getBundlecap(bundleID) -> devnode or undefined
* D(devices.bundle).getNamedBundlecap(name) -> devnode or undefined

The device node returned by getBundlecap() is called, unsurprisingly, a
"bundlecap". Most vats interact with bundlecaps, not bundleIDs (although of
course somebody must call `getBundlecap()` first). Holding a bundlecap
guarantees that the bundle contents are available, since `getBundlecap()`
will fail unless the bundle is currently installed. When we implement
refcounting GC for bundles, the bundlecap will maintain a reference and
protect the bundle data from collection.

The bundlecap device node provides two device-invocation methods to callers:

* D(bundlecap).getBundleID() -> string (bundleID)
* D(bundlecap).getBundle() -> string (the bundle contents)

For now, the only way to give a bundle to `importBundle()` is to obtain its
string contents first, but eventually we hope to implement more direct
support and keep the large string out of syscall results and userspace
entirely.

*/

export function buildDevice(tools, endowments) {
  const { hasBundle, getBundle, getNamedBundleID } = endowments;
  const { syscall } = tools;
  const dtools = buildSerializationTools(syscall, 'bundle');
  const { unserialize, returnFromInvoke, deviceNodeForSlot } = dtools;

  const ROOT = 'd+0';
  const bundleIDRE = new RegExp('^b1-[0-9a-f]{128}$');
  const nextDeviceNodeIDKey = 'nextDev';

  // reminder: you may not perform vatstore writes during buildDevice(),
  // because it runs on each kernel reboot, which is not consistent among
  // members of a consensus kernel

  function allocateDeviceNode() {
    let s = syscall.vatstoreGet(nextDeviceNodeIDKey);
    if (!s) {
      s = '1';
    }
    const id = BigInt(s);
    syscall.vatstoreSet(nextDeviceNodeIDKey, `${id + 1n}`);
    return `d+${id}`;
  }

  function returnCapForBundleID(bundleID) {
    assert(bundleID);
    const idToBundleKey = `id.${bundleID}`;
    let cap;
    cap = syscall.vatstoreGet(idToBundleKey);
    if (!cap) {
      if (!hasBundle(bundleID)) {
        return returnFromInvoke(undefined);
      }
      cap = allocateDeviceNode();
      syscall.vatstoreSet(idToBundleKey, cap);
      const capToIDKey = `slot.${cap}`;
      syscall.vatstoreSet(capToIDKey, bundleID);
    }
    return returnFromInvoke(deviceNodeForSlot(cap));
  }

  // invoke() should use unserialize() and returnFromInvoke. Throwing an
  // error will cause the calling vat's D() to throw.

  const dispatch = {
    invoke: (dnid, method, argsCapdata) => {
      /** @type {any} */
      const args = unserialize(argsCapdata);

      if (dnid === ROOT) {
        // D(devices.bundle).getBundlecap(id) -> bundlecap
        if (method === 'getBundlecap') {
          const [bundleID] = args;
          assert.typeof(bundleID, 'string');
          assert(bundleIDRE.test(bundleID), 'not a bundleID');
          return returnCapForBundleID(bundleID);
        }
        // D(devices.bundle).getNamedBundlecap(name) -> bundlecap
        if (method === 'getNamedBundlecap') {
          const [name] = args;
          assert.typeof(name, 'string');
          let bundleID;
          try {
            // this throws on a bad name, so make a better error
            bundleID = getNamedBundleID(name);
          } catch (e) {
            throw Error(`unregistered bundle name '${name}'`);
          }
          return returnCapForBundleID(bundleID);
        }
        throw TypeError(`target[${method}] does not exist`);
      }

      const capToIDKey = `slot.${dnid}`;
      const bundleID = syscall.vatstoreGet(capToIDKey);
      if (bundleID) {
        // D(bundlecap).getBundleID() -> id
        if (method === 'getBundleID') {
          return returnFromInvoke(bundleID);
        }
        // D(bundlecap).getBundle() -> bundle
        if (method === 'getBundle') {
          return returnFromInvoke(getBundle(bundleID));
        }
        throw TypeError(`bundlecap[${method}] does not exist`);
      }
      throw TypeError(`unknown device node ${dnid}, shouldn't happen`);
    },
  };
  return dispatch;
}
