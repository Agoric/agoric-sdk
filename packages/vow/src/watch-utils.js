// @ts-check

import { M } from '@endo/patterns';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('./watch.js').Watch} watch
 * @param {() => import('./types.js').VowKit<any>} makeVowKit
 */
export const prepareWatchUtils = (zone, watch, makeVowKit) => {
  const detached = zone.detached();
  const makeWatchUtilsKit = zone.exoClassKit(
    'WatchUtils',
    {
      utils: M.interface('Utils', {
        awaitAll: M.call(M.any()).returns(M.any()),
      }),
      helpers: M.interface('Helpers', {
        check: M.call(M.any(), M.any()).returns(),
      }),
      watcher: M.interface('Watcher', {
        onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
        onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
      }),
    },
    () => {
      return {
        id: 0n,
        /** @type {MapStore<bigint, number>} */
        count: detached.mapStore('count'),

        /** @type {MapStore<bigint, number>} */
        length: detached.mapStore('length'),

        /** @type {MapStore<bigint, any[]>} */
        results: detached.mapStore('results'),

        /** @type {MapStore<bigint, import('./types.js').VowKit>} */
        kits: detached.mapStore('kits'),
      };
    },
    {
      utils: {
        awaitAll(vows) {
          const { id } = this.state;
          const kit = makeVowKit();

          this.state.kits.init(id, kit);
          this.state.count.init(id, 0);
          this.state.length.init(id, vows.length);
          this.state.results.init(id, harden([]));

          for (const vow of vows) {
            watch(vow, this.facets.watcher, { id });
          }

          this.state.id += 1n;
          return kit.vow;
        },
      },
      helpers: {
        check(value, id) {
          const kit = this.state.kits.get(id);
          const count = this.state.count.get(id) + 1;
          const length = this.state.length.get(id);
          const results = this.state.results;

          this.state.count.set(id, count);
          results.set(id, [...results.get(id), value]);

          if (count === length) {
            kit.resolver.resolve([...results.get(id).values()]);
          }
        },
      },
      watcher: {
        onFulfilled(value, { id }) {
          this.facets.helpers.check(value, id);
        },
        onRejected(value, { id }) {
          this.facets.helpers.check(value, id);
        },
      },
    },
  );

  const makeWatchUtil = () => {
    const { utils } = makeWatchUtilsKit();
    return harden(utils);
  };

  return makeWatchUtil;
};

harden(prepareWatchUtils);
