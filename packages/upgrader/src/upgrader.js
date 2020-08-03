// @ts-check
import { E, HandledPromise } from '@agoric/eventual-send';
import { producePromise } from '@agoric/produce-promise';

import './types';

/**
 * @enum {number} MutabilityState
 */
const MutabilityState = {
  INIT: 0,
  INSTALLED: 1,
  FINISHED: 2,
  REVOKED: 3,
};

/**
 * @template {Object} T
 * @param {T} [initialInstance]
 * @returns {UpgraderKit<T>}
 */
export function makeUpgraderKit(initialInstance = undefined) {
  let mutability = MutabilityState.INIT;

  const assertMutable = () => {
    switch (mutability) {
      case MutabilityState.FINISHED:
        throw Error(`Upgrader already finished`);
      case MutabilityState.REVOKED:
        throw Error(`Upgrader already revoked`);
      default:
        return true;
    }
  };

  /** @type {PromiseRecord<T>} */
  let upgradablePK = producePromise();
  /** @type {T | undefined} */
  let lastInstance = initialInstance;

  /** @type {(instance: PromiseOrNot<T>) => void} */
  let resolveUpgradableP;

  /** @type {(reason?: any) => void} */
  let rejectUpgradableP;

  const upgradableP = new HandledPromise(
    (resolve, reject) => {
      resolveUpgradableP = resolve;
      rejectUpgradableP = reject;
    },
    {
      applyMethod(_p, name, args) {
        if (name === undefined) {
          return /** @type {Function} */ (E(upgradablePK.promise))(...args);
        }
        return E(upgradablePK.promise)[name](...args);
      },
      get(_p, name) {
        return E.G(upgradablePK.promise)[name];
      },
    },
  );

  /** @type {Upgrader<T>} */
  const upgrader = {
    finish() {
      assertMutable();
      if (!lastInstance) {
        const err = Error(`No instance was ever installed`);
        upgrader.revoke(err);
        throw err;
      }
      mutability = MutabilityState.FINISHED;
      resolveUpgradableP(lastInstance);
      upgradablePK.resolve(lastInstance);
    },
    revoke(reason = undefined) {
      assertMutable();
      rejectUpgradableP(reason);
      upgradablePK.reject(reason);

      // These steps are to ensure that we rejected
      // the promise kit.
      upgradablePK = producePromise();
      upgradablePK.reject(reason);

      mutability = MutabilityState.REVOKED;
      lastInstance = undefined;
    },
    async upgrade(replacerP) {
      assertMutable();
      if (lastInstance) {
        // We deliberately stall until the upgrade succeeds.
        upgradablePK = producePromise();
      }
      const ourPK = upgradablePK;
      const newInstanceP = E(replacerP).upgradeFromLast(undefined);
      newInstanceP.catch(_ => {
        // Reinstall the old version.
        if (lastInstance) {
          upgradablePK.resolve(lastInstance);
        }
      });

      // If we throw, we'll hit the above catch block on our way.
      const newInstance = /** @type {T} */ (await newInstanceP);
      // AWAIT

      if (upgradablePK !== ourPK) {
        // We've moved on to another request.
        throw Error(`Stale upgrade request`);
      }

      assertMutable();
      mutability = MutabilityState.INSTALLED;
      lastInstance = newInstance;
      upgradablePK.resolve(newInstance);

      // Give back what we got from the upgrade function.
      return upgradablePK.promise;
    },
  };

  return harden({
    upgradableP,
    upgrader,
  });
}
