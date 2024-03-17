import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { getVowPayload } from '@agoric/vow/src/vow-utils.js';
import { Far } from '@endo/pass-style';
import { makeEphemera } from './ephemera.js';

export const vowishKey = k => {
  const payload = getVowPayload(k);
  if (payload === undefined) {
    return k;
  }
  const { vowV0 } = payload;
  // vowMap.set(vowV0, h);
  return vowV0;
};
harden(vowishKey);

const WeakBijectionI = M.interface('WeakBijection', {
  reset: M.call().returns(),
  init: M.call(M.any(), M.any()).returns(),
  hasGuest: M.call(M.any()).returns(M.boolean()),
  hasHost: M.call(M.any()).returns(M.boolean()),
  has: M.call(M.any(), M.any()).returns(M.boolean()),
  guestToHost: M.call(M.any()).returns(M.any()),
  hostToGuest: M.call(M.any()).returns(M.any()),
  define: M.call(M.any(), M.any()).returns(),
});

/**
 * Makes a store like a WeakMapStore except that Promises and Vows can also be
 * used as keys.
 * NOTE: This depends on promise identity being stable!
 *
 * @param {string} name
 */
const makeVowishStore = name => {
  // The vowMap would be needed if we supported enumeration,
  // in order to reconstruct the original keys.
  // const vowMap = new Map();
  const map = new WeakMap();

  return Far(name, {
    init: (k, v) => {
      const k2 = vowishKey(k);
      !map.has(k2) ||
        // separate line so I can set a breakpoint
        Fail`key already bound: ${k} -> ${map.get(k2)} vs ${v}`;
      map.set(k2, v);
    },
    has: k => map.has(vowishKey(k)),
    get: k => {
      const k2 = vowishKey(k);
      map.has(k2) ||
        // separate line so I can set a breakpoint
        Fail`key not found: ${k}`;
      return map.get(k2);
    },
  });
};

/** @typedef {ReturnType<makeVowishStore>} VowishStore */

/**
 * @param {Zone} zone
 */
export const prepareWeakBijection = zone => {
  /** @type {Ephemera<WeakBijection, VowishStore>} */
  const g2h = makeEphemera(() => makeVowishStore('guestToHost'));
  /** @type {Ephemera<WeakBijection, VowishStore>} */
  const h2g = makeEphemera(() => makeVowishStore('hostToGuest'));

  return zone.exoClass('WeakBijection', WeakBijectionI, () => ({}), {
    reset() {
      const { self } = this;

      g2h.resetFor(self);
      h2g.resetFor(self);
    },
    init(g, h) {
      const { self } = this;
      const guestToHost = g2h.for(self);
      const hostToGuest = h2g.for(self);

      guestToHost.init(g, h);
      hostToGuest.init(h, g);
      self.has(g, h) ||
        // separate line so I can set a breakpoint
        Fail`internal: ${g} <-> ${h}`;
    },
    define(g, h) {
      const { self } = this;

      if (!self.has(g, h)) {
        self.init(g, h);
      }
    },
    hasGuest(g) {
      const { self } = this;
      const guestToHost = g2h.for(self);

      return guestToHost.has(g);
    },
    hasHost(h) {
      const { self } = this;
      const hostToGuest = h2g.for(self);

      return hostToGuest.has(h);
    },
    has(g, h) {
      const { self } = this;
      const guestToHost = g2h.for(self);
      const hostToGuest = h2g.for(self);

      if (guestToHost.has(g)) {
        guestToHost.get(g) === h ||
          Fail`internal: g->h ${g} -> ${h} vs ${guestToHost.get(g)}`;
        hostToGuest.get(h) === g ||
          Fail`internal h->g: ${h} -> ${g} vs ${hostToGuest.get(h)}`;
        return true;
      } else {
        !hostToGuest.has(h) ||
          Fail`internal: unexpected h->g ${h} -> ${guestToHost.get(h)}`;
        return false;
      }
    },
    guestToHost(g) {
      const { self } = this;
      const guestToHost = g2h.for(self);

      return guestToHost.get(g);
    },
    hostToGuest(h) {
      const { self } = this;
      const hostToGuest = h2g.for(self);

      return hostToGuest.get(h);
    },
  });
};
harden(prepareWeakBijection);

/**
 * @typedef {ReturnType<ReturnType<prepareWeakBijection>>} WeakBijection
 */
