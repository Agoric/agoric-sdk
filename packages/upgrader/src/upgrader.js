// @ts-check
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { producePromise } from '@agoric/produce-promise';

import './types';

/**
 * @template T
 * @param {T} [initialInstance]
 * @returns {UpgraderKit<T>}
 */
export function makeUpgraderKit(initialInstance = undefined) {
  assert(
    initialInstance === undefined,
    details`initialInstance not implemented`,
  );

  /** @type {PromiseRecord<T>} */
  const upgradablePK = producePromise();

  /** @type {Upgrader<T>} */
  const upgrader = {
    async upgrade(replacerP) {
      // We deliberately stall until the upgrade succeeds.
      const newInstance = await E(replacerP).upgradeFromLast(undefined);

      // Only now is it safe to replace the upgradable.
      upgradablePK.resolve(newInstance);

      // Give back what we got from the upgrade function.
      return newInstance;
    },
  };

  return harden({
    upgradableP: upgradablePK.promise,
    upgrader,
  });
}
