// @ts-check
import { E, HandledPromise } from '@agoric/eventual-send';
import { producePromise } from '@agoric/produce-promise';

import './types';

/**
 * @enum {number} Internal state of the upgradableP
 */
const MutabilityState = {
  /**
   * The upgradableP is queuing messages before the first
   * installation.
   */
  QUEUING: 0,
  /**
   * The upgradeableP has an active implementation.
   */
  INSTALLED: 1,
  /**
   * The upgradableP has been permanently resolved.
   */
  FINISHED: 2,
  /**
   * The upgradableP has been permanently rejected.
   */
  REVOKED: 3,
};

/**
 * Create a HandledPromise handler to forward to the results
 * of a thunk.
 * @param {() => any} getTarget fetch the latest value of the target
 */
const makeForwardingHandler = getTarget => ({
  applyMethod(_p, name, args) {
    if (name === undefined) {
      // @ts-ignore This expression is not callable.
      return E(getTarget())(...args);
    }
    return E(getTarget())[name](...args);
  },
  get(_p, name) {
    // @ts-ignore Symbol can't be an index type.
    return E.G(getTarget())[name];
  },
});

/**
 * Create a HandledPromise that is stable even though it forwards
 * to the latest "upgrade" of the underlying implementation.
 *
 * The `upgrader` has methods for managing the mapping of the
 * upgradableP to its implementation.  Notably, upgrades only
 * take effect if they can be successfully installed.
 *
 * We take advantage of promise pipelining so that
 * the stable `upgradableP` forwards eventual calls (using tildot or E())
 * but is not actually resolved or rejected unless the upgrader asks
 * to permanently finish() or revoke() it.
 *
 * @template {Object} T The type of the HandledPromise must be an object
 * so that it can be used with the `@agoric/marshal` system.
 * @param {T} [initialInstance] If set, the initial implementation of
 * the HandledPromise.
 * @returns {UpgraderKit<T>} The upgradableP and upgrader facet.
 */
export function makeUpgraderKit(initialInstance = undefined) {
  let mutability = MutabilityState.QUEUING;

  const assertMutable = () => {
    switch (mutability) {
      case MutabilityState.FINISHED: {
        throw Error(`Upgrader already finished`);
      }
      case MutabilityState.REVOKED: {
        throw Error(`Upgrader already revoked`);
      }
      default: {
        return true;
      }
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
    makeForwardingHandler(() => upgradablePK.promise),
  );

  /** @type {Upgrader<T>} */
  const upgrader = {
    finish() {
      assertMutable();
      if (mutability === MutabilityState.QUEUING) {
        const err = Error(`No instance was ever installed`);
        upgrader.revoke(err);
        throw err;
      }
      const final = /** @type {T} */ (lastInstance);
      lastInstance = undefined;
      mutability = MutabilityState.FINISHED;
      resolveUpgradableP(final);
      upgradablePK.resolve(final);
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
      /** @type {Promise<T> | undefined} */
      let priorP;
      const prior = /** @type {T} */ (lastInstance);
      if (mutability !== MutabilityState.QUEUING) {
        // We deliberately stall until the upgrade succeeds.
        priorP = new HandledPromise((_res, _rej, resolveWithPresence) => {
          // Wrap the old implementation in a presence so that the
          // user cannot reach into it.
          resolveWithPresence(makeForwardingHandler(() => prior));
        });
        upgradablePK = producePromise();
      }
      const ourPK = upgradablePK;
      const newInstanceP = E(replacerP).upgradeFrom(priorP);
      newInstanceP.catch(_ => {
        // Reinstall the old version.
        if (priorP) {
          upgradablePK.resolve(prior);
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
      upgradablePK.resolve(lastInstance);

      // Give back what we got from the upgrade function.
      return upgradablePK.promise;
    },
  };

  return harden({
    upgradableP,
    upgrader,
  });
}
