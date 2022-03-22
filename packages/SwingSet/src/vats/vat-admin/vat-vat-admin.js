/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import { makePromiseKit } from '@endo/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { Far, passStyleOf } from '@endo/marshal';
import { Nat } from '@agoric/nat';
import { assert } from '@agoric/assert';

const managerTypes = [
  'local',
  'nodeWorker',
  'node-subprocess',
  'xs-worker',
  'xs-worker-no-gc',
];

function producePRR() {
  const { promise, resolve, reject } = makePromiseKit();
  return [promise, { resolve, reject }];
}

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  const pending = new Map(); // vatID -> { resolve, reject } for promise
  const running = new Map(); // vatID -> { resolve, reject } for doneP
  const meterByID = new Map(); // meterID -> { meter, updater }
  const meterIDByMeter = new WeakMap(); // meter -> meterID
  let vatAdminNode;
  const pendingBundles = new Map(); // bundleID -> Promise<BundleCap>
  const pendingUpgrades = new Map(); // upgradeID -> Promise<UpgradeResults>

  // this message is queued to us by kernel.installBundle()
  function bundleInstalled(bundleID) {
    if (vatAdminNode && pendingBundles.has(bundleID)) {
      const bundlecap = D(vatAdminNode).getBundleCap(bundleID);
      if (!bundlecap) {
        // if the bundle got uninstalled by the time we got the message, keep
        // waiting, maybe it will get reinstalled some day
        console.log(`bundle ${bundleID} missing, hoping for reinstall`);
        return;
      }
      pendingBundles.get(bundleID).resolve(bundlecap);
      pendingBundles.delete(bundleID);
    }
  }

  function makeMeter(remaining, threshold) {
    Nat(remaining);
    Nat(threshold);
    const meterID = D(vatAdminNode).createMeter(remaining, threshold);
    const { updater, notifier } = makeNotifierKit();
    const meter = Far('meter', {
      addRemaining(delta) {
        D(vatAdminNode).addMeterRemaining(meterID, Nat(delta));
      },
      setThreshold(newThreshold) {
        D(vatAdminNode).setMeterThreshold(meterID, Nat(newThreshold));
      },
      get: () => D(vatAdminNode).getMeter(meterID), // returns BigInts
      getNotifier: () => notifier,
    });
    meterByID.set(meterID, harden({ meter, updater }));
    meterIDByMeter.set(meter, meterID);
    return meter;
  }

  function makeUnlimitedMeter() {
    const meterID = D(vatAdminNode).createUnlimitedMeter();
    const { updater, notifier } = makeNotifierKit();
    const meter = Far('meter', {
      addRemaining(_delta) {},
      setThreshold(_newThreshold) {},
      get: () => harden({ remaining: 'unlimited', threshold: 0 }),
      getNotifier: () => notifier, // will never fire
    });
    meterByID.set(meterID, harden({ meter, updater }));
    meterIDByMeter.set(meter, meterID);
    return meter;
  }

  function finishVatCreation(vatID) {
    const [promise, pendingRR] = producePRR();
    pending.set(vatID, pendingRR);

    const [doneP, doneRR] = producePRR();
    running.set(vatID, doneRR);
    doneP.catch(() => {}); // shut up false whine about unhandled rejection

    const adminNode = Far('adminNode', {
      terminateWithFailure(reason) {
        D(vatAdminNode).terminateWithFailure(vatID, reason);
      },
      done() {
        return doneP;
      },
      upgrade(bundlecap, vatParameters) {
        let bundleID;
        try {
          bundleID = D(bundlecap).getBundleID();
        } catch (e) {
          // 'bundlecap' probably wasn't a bundlecap
          throw Error('vat adminNode.upgrade() requires a bundlecap');
        }
        const upgradeID = D(vatAdminNode).upgradeVat(bundleID, vatParameters);
        const [upgradeCompleteP, upgradeRR] = producePRR();
        pendingUpgrades.set(upgradeID, upgradeRR);
        return upgradeCompleteP;
      },
    });
    return promise.then(root => {
      return { adminNode, root };
    });
  }

  function assertType(name, obj, type) {
    if (obj) {
      assert.typeof(obj, type, `CreateVatOptions(${name})`);
    }
  }

  function convertOptions(origOptions) {
    const {
      description,
      meter, // stripped out and converted
      managerType, // TODO: not sure we want vats to be able to control this
      vatParameters, // stripped out and re-added
      enableSetup,
      enablePipelining,
      enableVatstore,
      virtualObjectCacheSize,
      useTranscript,
      reapInterval,
      ...rest
    } = origOptions;

    // these are all flat data: no slots (Presences/Promises/etc)
    assertType('description', description, 'string');
    assertType('managerType', managerType, 'string');
    if (managerType) {
      assert(
        managerTypes.includes(managerType),
        `CreateVatOptions bad managerType ${managerType}`,
      );
    }
    assertType('enableSetup', enableSetup, 'boolean');
    assertType('enablePipelining', enablePipelining, 'boolean');
    assertType('enableVatstore', enableVatstore, 'boolean');
    assertType('virtualObjectCacheSize', virtualObjectCacheSize, 'number');
    assertType('useTranscript', useTranscript, 'boolean');
    assertType('reapInterval', reapInterval, 'number');

    // reject unknown options
    const unknown = Object.keys(rest).join(',');
    if (unknown) {
      assert.fail(`CreateVatOptions unknown options ${unknown}`);
    }

    // convert meter to meterID
    let meterID;
    if (meter) {
      meterID = meterIDByMeter.get(origOptions.meter);
    }

    // TODO: assert vatParameters is Durable

    // now glue everything back together
    const options = {
      description,
      meterID, // replaces 'meter'
      managerType,
      vatParameters,
      enableSetup,
      enablePipelining,
      enableVatstore,
      virtualObjectCacheSize,
      useTranscript,
      reapInterval,
    };
    return harden(options);
  }

  function createVatAdminService(vaDevice) {
    vatAdminNode = vaDevice;
    return Far('vatAdminService', {
      waitForBundleCap(bundleID) {
        const bundlecap = D(vatAdminNode).getBundleCap(bundleID);
        if (bundlecap) {
          return bundlecap;
        }
        if (!pendingBundles.has(bundleID)) {
          pendingBundles.set(bundleID, makePromiseKit());
        }
        return pendingBundles.get(bundleID).promise;
      },
      getBundleCap(bundleID) {
        const bundlecap = D(vatAdminNode).getBundleCap(bundleID);
        if (bundlecap) {
          return bundlecap;
        }
        throw Error(`bundleID not yet installed: ${bundleID}`);
      },
      getNamedBundleCap(name) {
        return D(vatAdminNode).getNamedBundleCap(name);
      },
      createMeter(remaining, threshold) {
        return makeMeter(remaining, threshold);
      },
      createUnlimitedMeter() {
        return makeUnlimitedMeter();
      },
      createVat(bundleOrBundleCap, options = {}) {
        const co = convertOptions(options);
        let vatID;
        if (passStyleOf(bundleOrBundleCap) === 'remotable') {
          const bundlecap = bundleOrBundleCap;
          let bundleID;
          try {
            bundleID = D(bundlecap).getBundleID();
          } catch (e) {
            // 'bundlecap' probably wasn't a bundlecap
            throw Error('Vat Creation Error: createVat() requires a bundlecap');
          }
          assert.typeof(bundleID, 'string', `createVat() no bundleID`);
          vatID = D(vatAdminNode).createByBundleID(bundleID, co);
        } else {
          // eventually this option will go away: userspace will be obligated
          // to use an ID, not a full bundle
          const bundle = bundleOrBundleCap;
          assert(
            bundle.moduleFormat,
            'createVat(bundle) does not look like a bundle',
          );
          vatID = D(vatAdminNode).createByBundle(bundle, co);
        }
        return finishVatCreation(vatID);
      },
      createVatByName(bundleName, options = {}) {
        // eventually this option will go away: userspace will be obligated
        // to use getNamedBundleCap(), probably during bootstrap, to fetch
        // the named bundlecaps early, and then distribute specific
        // bundlecaps to any vat which wants to make a vat from them (e.g.
        // zoe with ZCF). That requires chain-side changes that I want to
        // coordinate separately, so I'll leave this in place until later.
        assert.typeof(
          bundleName,
          'string',
          `createVatByName() requires bundleName to be a string`,
        );
        const co = convertOptions(options);
        const bundlecap = D(vatAdminNode).getNamedBundleCap(bundleName);
        const bundleID = D(bundlecap).getBundleID();
        const vatID = D(vatAdminNode).createByBundleID(bundleID, co);
        return finishVatCreation(vatID);
      },
    });
  }

  // this message is queued to us by createVatDynamically
  function newVatCallback(vatID, results) {
    const { resolve, reject } = pending.get(vatID);
    pending.delete(vatID);
    if (results.rootObject) {
      resolve(results.rootObject);
    } else {
      reject(Error(`Vat Creation Error: ${results.error}`));
    }
  }

  // the kernel queues this to us when a vat upgrade completes or fails
  function vatUpgradeCallback(upgradeID, success, error) {
    const { resolve, reject } = pendingUpgrades.get(upgradeID);
    pendingUpgrades.delete(upgradeID);
    if (success) {
      resolve('ok'); // TODO maybe provide the root object again?
    } else {
      reject(error);
    }
    // TODO: if we get `newVatCallback(error)` or `vatTerminated()`, should
    // we reject all pendingUpgrades. That will require indexing
    // pendingUpgrades by vatID.
  }

  function meterCrossedThreshold(meterID, remaining) {
    const { updater } = meterByID.get(meterID);
    updater.updateState(remaining);
  }

  // the kernel sends this when the vat halts
  function vatTerminated(vatID, shouldReject, info) {
    if (pending.has(vatID)) {
      // This happens when a dynamic vat survives `createDynamicVat` but fails
      // during `startVat`.  In that case, the `newVatCallback` success message
      // that got sent was unwound by the failed delivery crank abort and will
      // never be seen.  However, as a consolation prize the crank abort queued
      // a `vatTerminated` message for the vat.  So if we see a `vatTerminated`
      // for a vat before seeing a `newVatCallback` for that same vat, it means
      // the vat setup failed.  In this case we should simulate an errorful
      // `newVatCallback` so the caller will be notified about their misfortune.
      newVatCallback(vatID, { error: info });
    }
    if (!running.has(vatID)) {
      // a static vat terminated, so we have nobody to notify
      console.log(`DANGER: static vat ${vatID} terminated`);
      // TODO: consider halting the kernel if this happens, static vats
      // aren't supposed to just keel over and die
      return;
    }
    const { resolve, reject } = running.get(vatID);
    running.delete(vatID);
    if (shouldReject) {
      reject(info);
    } else {
      resolve(info);
    }
  }

  return Far('root', {
    createVatAdminService,
    bundleInstalled,
    newVatCallback,
    vatUpgradeCallback,
    vatTerminated,
    meterCrossedThreshold,
  });
}
