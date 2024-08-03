// Disclaimer: At the present time this file has not been tested at all.
// It is an experiment in response to
// https://github.com/Agoric/agoric-sdk/pull/1949#issuecomment-720121505
// This experiment proposes that the answer to @michaelfig's question is
// to nest lossless delta subscriptions inside lossy snapshot notifiers.
//
// If this experiment works out, it or something like it may eventually move
// from test/ to src/

import { q, Fail } from '@endo/errors';
import {
  makeNotifierKit,
  makeSubscriptionKit,
  observeIteration,
} from '../src/index.js';

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
      deltaCount += 1;
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
      // @ts-expect-error m typed as Map
      m = undefined;
    },
    fail: reason => {
      deltaPublication.fail(reason);
      deltaPublication = undefined;
      updater.fail(reason);
      deltaPublication = undefined;
      deltaSubscription = undefined;
      // @ts-expect-error m typed as Map
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
          Fail`unexpected deltaKind ${q(deltaKind)}`;
        }
      }
    },
  });

  const snapshotObserver = harden({
    updateState: ({ entries, deltaSubscription }) => {
      m = new Map(entries);
      void observeIteration(deltaSubscription, deltaObserver);
    },
    finish: _completion => {
      // @ts-expect-error m typed as Map
      m = undefined;
    },
    fail: _reason => {
      // @ts-expect-error m typed as Map
      m = undefined;
    },
  });
  void observeIteration(snapshotNotifierP, snapshotObserver);

  return mapFollower;
};
