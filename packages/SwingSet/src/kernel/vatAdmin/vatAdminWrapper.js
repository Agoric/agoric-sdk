/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import { makePromiseKit } from '@agoric/promise-kit';
import { makeNotifierKit } from '@agoric/notifier';
import { Far, passStyleOf } from '@endo/marshal';
import { Nat } from '@agoric/nat';
import { assert } from '@agoric/assert';

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
  const pendingBundles = new Map(); // bundleID -> Promise<bundlecap>

  // this message is queued to us by kernel.installBundle()
  function bundleInstalled(bundleID) {
    if (vatAdminNode && pendingBundles.has(bundleID)) {
      const bundlecap = D(vatAdminNode).getBundlecap(bundleID);
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
    });
    return promise.then(root => {
      return { adminNode, root };
    });
  }

  function convertOptions(origOptions) {
    const options = { ...origOptions };
    delete options.meterID;
    delete options.meter;
    if (origOptions.meter) {
      const meterID = meterIDByMeter.get(origOptions.meter);
      options.meterID = meterID;
    }
    return harden(options);
  }

  function createVatAdminService(vaDevice) {
    vatAdminNode = vaDevice;
    return Far('vatAdminService', {
      waitForBundlecap(bundleID) {
        const bundlecap = D(vatAdminNode).getBundlecap(bundleID);
        if (bundlecap) {
          return bundlecap;
        }
        if (!pendingBundles.has(bundleID)) {
          pendingBundles.set(bundleID, makePromiseKit());
        }
        return pendingBundles.get(bundleID).promise;
      },
      getBundlecap(bundleID) {
        const bundlecap = D(vatAdminNode).getBundlecap(bundleID);
        if (bundlecap) {
          return bundlecap;
        }
        throw Error(`bundleID not yet installed: ${bundleID}`);
      },
      getNamedBundlecap(name) {
        return D(vatAdminNode).getNamedBundlecap(name);
      },
      createMeter(remaining, threshold) {
        return makeMeter(remaining, threshold);
      },
      createUnlimitedMeter() {
        return makeUnlimitedMeter();
      },
      createVat(bundleOrBundlecap, options = {}) {
        const co = convertOptions(options);
        let vatID;
        if (passStyleOf(bundleOrBundlecap) === 'remotable') {
          const bundlecap = bundleOrBundlecap;
          let bundleID;
          try {
            bundleID = D(bundlecap).getBundleID();
          } catch (e) {
            // 'bundlecap' probably wasn't a bundlecap
            throw Error('Vat Creation Error: createVat() requires a bundlecap');
          }
          assert.typeof(bundleID, 'string');
          vatID = D(vatAdminNode).createByBundleID(bundleID, co);
        } else {
          // eventually this option will go away: userspace will be obligated
          // to use an ID, not a full bundle
          const bundle = bundleOrBundlecap;
          assert(bundle.moduleFormat, 'does not look like a bundle');
          vatID = D(vatAdminNode).createByBundle(bundle, co);
        }
        return finishVatCreation(vatID);
      },
      createVatByName(bundleName, options = {}) {
        // eventually this option will go away: userspace will be obligated
        // to use getNamedBundlecap(), probably during bootstrap, to fetch
        // the named bundlecaps early, and then distribute specific
        // bundlecaps to any vat which wants to make a vat from them (e.g.
        // zoe with ZCF). That requires chain-side changes that I want to
        // coordinate separately, so I'll leave this in place until later.
        assert.typeof(bundleName, 'string');
        const co = convertOptions(options);
        const bundlecap = D(vatAdminNode).getNamedBundlecap(bundleName);
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

  function meterCrossedThreshold(meterID, remaining) {
    const { updater } = meterByID.get(meterID);
    updater.updateState(remaining);
  }

  // the kernel sends this when the vat halts
  function vatTerminated(vatID, shouldReject, info) {
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
    vatTerminated,
    meterCrossedThreshold,
  });
}
