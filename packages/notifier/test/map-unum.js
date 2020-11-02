import { assert, details as d, q } from '@agoric/assert';
import {
  makeNotifierKit,
  makeSubscriptionKit,
  observeIteration,
} from '../src/index';

export const makeMapLeader = initialEntries => {
  let m = new Map(initialEntries);
  const { updater, notifier } = makeNotifierKit();
  let deltaPublication;
  let deltaSubscription;
  let deltaCount;

  const change = delta => {
    if (deltaCount >= m.size) {
      // eslint-disable-next-line no-use-before-define
      snapshot();
    } else {
      deltaPublication.updateState(delta);
    }
  };

  const mapLeader = harden({
    get: key => m.get(key),
    has: key => m.has(key),
    entries: () => harden(m.entries()),
    getSnapshotNotifier: () => notifier,

    set: (key, val) => {
      m.set(key, val);
      change(harden(['set', key, val]));
    },
    delete: key => {
      m.delete(key);
      change(harden(['delete', key]));
    },

    finish: completion => {
      deltaPublication.finish(completion);
      updater.finish(completion);
      deltaPublication = undefined;
      deltaSubscription = undefined;
      m = undefined;
    },
    fail: reason => {
      deltaPublication.fail(reason);
      deltaPublication = undefined;
      updater.fail(reason);
      deltaPublication = undefined;
      deltaSubscription = undefined;
      m = undefined;
    },
  });

  const snapshot = () => {
    if (deltaPublication !== undefined) {
      deltaPublication.finish('switch to newer snapshot');
    }
    const { publication, subscription } = makeSubscriptionKit();
    deltaPublication = publication;
    deltaSubscription = subscription;
    deltaCount = 0;

    const entries = mapLeader.entries();
    const snapshotRecord = harden({
      entries,
      deltaSubscription,
    });
    updater.updateState(snapshotRecord);
  };
  snapshot();

  return mapLeader;
};

export const makeMapFollower = snapshotNotifierP => {
  let m = new Map();

  const mapFollower = harden({
    get: key => m.get(key),
    has: key => m.has(key),
    entries: () => harden(m.entries()),
    getSnapshotNotifier: () => snapshotNotifierP,
  });

  const deltaObserver = harden({
    updateState: ([deltaKind, ...deltaArgs]) => {
      switch (deltaKind) {
        case 'set': {
          const [key, val] = deltaArgs;
          m.set(key, val);
          break;
        }
        case 'delete': {
          const [key] = deltaArgs;
          m.delete(key);
          break;
        }
        default: {
          throw assert.fail(d`unexpected deltaKind ${q(deltaKind)}`);
        }
      }
    },
  });

  const snapshotObserver = harden({
    updateState: ({ entries, deltaSubscription }) => {
      m = new Map(entries);
      observeIteration(deltaSubscription, deltaObserver);
    },
    finish: _completion => {
      m = undefined;
    },
    fail: _reason => {
      m = undefined;
    },
  });
  observeIteration(snapshotNotifierP, snapshotObserver);

  return mapFollower;
};
