// @jessie-check

import { makeScalarBigWeakMapStore } from '@agoric/vat-data';
import { provideLazy } from '@agoric/store';
import { makeNotifierKit } from '@agoric/notifier';

/**
 * @import {Purse} from './types.js';
 * @import {LatestTopic, NotifierRecord} from '@agoric/notifier';
 */

// Note: Virtual for high cardinality, but *not* durable, and so
// broken across an upgrade.
export const makeTransientNotifierKit = () => {
  /** @type {WeakMapStore<Purse, NotifierRecord<any>>} */
  const transientNotiferKits = makeScalarBigWeakMapStore(
    'transientNotiferKits',
  );

  const provideNotifierKit = key =>
    provideLazy(transientNotiferKits, key, () =>
      makeNotifierKit(key.getCurrentAmount()),
    );

  const provideNotifier = key => provideNotifierKit(key).notifier;
  const update = (key, newValue) => {
    if (transientNotiferKits.has(key)) {
      const { updater } = transientNotiferKits.get(key);
      updater.updateState(newValue);
    }
  };

  return { provideNotifier, update };
};
harden(makeTransientNotifierKit);
