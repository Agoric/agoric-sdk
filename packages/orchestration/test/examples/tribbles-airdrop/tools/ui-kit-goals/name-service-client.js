// @ts-check
import { E, Far } from '@endo/far';
/**
 * @import {ERef} from '@endo/far';
 * @import {NameHub} from '@agoric/vats';
 */

/** @param {{ queryData: (path: string) => any }} qt */
export const makeAgoricNames = async qt => {
  assert(qt);
  const nameHubCache = new Map();

  /** @param {string} kind */
  const lookupKind = async kind => {
    assert.typeof(kind, 'string');
    if (nameHubCache.has(kind)) {
      return nameHubCache.get(kind);
    }
    const entries = await qt.queryData(`published.agoricNames.${kind}`);
    const record = Object.fromEntries(entries);
    const hub = Far('NameHub', {
      lookup: name => record[name],
      keys: () => entries.map(e => e[0]),
      entries: () => entries,
    });
    nameHubCache.set(kind, hub);
    return hub;
  };

  const invalidate = () => {
    nameHubCache.clear();
  };

  const hub0 = Far('Hub', {
    lookup: async (kind, ...more) => {
      const hub2 = lookupKind(kind);
      if (more.length > 0) {
        return E(hub2).lookup(...more);
      }
      return hub2;
    },
  });

  return { lookup: hub0.lookup, invalidate };
};
const pmethods = harden(['then', 'catch', 'finally']);
// See also: https://github.com/endojs/endo/tree/mfig-o/packages/o
/** @param {ERef<Pick<NameHub, 'lookup'>>} nodeP */

export const makeNameProxy = nodeP =>
  new Proxy(nodeP, {
    get(target, prop, _rx) {
      assert.typeof(prop, 'string');
      if (pmethods.includes(prop)) {
        return target[prop].bind(target);
      }
      return makeNameProxy(E(target).lookup(prop));
    },
  });
