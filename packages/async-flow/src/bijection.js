import { b, Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { Far } from '@endo/pass-style';
import { toPassableCap } from '@agoric/vow';
import { makeEphemera } from './ephemera.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Ephemera} from './types.js';
 */

const BijectionI = M.interface('Bijection', {
  reset: M.call().returns(),
  init: M.call(M.any(), M.any()).returns(),
  hasGuest: M.call(M.any()).returns(M.boolean()),
  hasHost: M.call(M.any()).returns(M.boolean()),
  has: M.call(M.any(), M.any()).returns(M.boolean()),
  guestToHost: M.call(M.any()).returns(M.any()),
  hostToGuest: M.call(M.any()).returns(M.any()),
});

/**
 * Makes a store like a WeakMapStore except that Promises and Vows can also be
 * used as keys.
 * NOTE: This depends on promise identity being stable!
 *
 * @param {string} name
 */
const makeVowishStore = name => {
  // This internal map could be (and was) a WeakMap. But there are various ways
  // in which a WeakMap is more expensive than a Map. The main advantage is
  // that a WeakMap can drop entries whose keys are not otherwise retained.
  // But async-flow only uses a bijection together with a log-store that happens
  // to durably retain all the host-side keys of the associated bijection, so
  // this additional feature of the bijection is irrelevant. When the bijection
  // is reset or revived in a new incarnation, these vowishStores will be gone
  // anyway, dropping all the guest-side objects.
  const map = new Map();

  return Far(name, {
    init: (k, v) => {
      const k2 = toPassableCap(k);
      !map.has(k2) ||
        // separate line so I can set a breakpoint
        Fail`${b(name)} key already bound: ${k} -> ${map.get(k2)} vs ${v}`;
      map.set(k2, v);
    },
    has: k => map.has(toPassableCap(k)),
    get: k => {
      const k2 = toPassableCap(k);
      map.has(k2) ||
        // separate line so I can set a breakpoint
        Fail`${b(name)} key not found: ${k}`;
      return map.get(k2);
    },
  });
};

/** @typedef {ReturnType<makeVowishStore>} VowishStore */

/**
 * @param {Zone} zone
 */
export const prepareBijection = zone => {
  /** @type {Ephemera<Bijection, VowishStore>} */
  const g2h = makeEphemera(() => makeVowishStore('guestToHost'));
  /** @type {Ephemera<Bijection, VowishStore>} */
  const h2g = makeEphemera(() => makeVowishStore('hostToGuest'));

  return zone.exoClass('Bijection', BijectionI, () => ({}), {
    reset() {
      const { self } = this;

      g2h.resetFor(self);
      h2g.resetFor(self);
    },
    init(g, h) {
      const { self } = this;
      const guestToHost = g2h.for(self);
      const hostToGuest = h2g.for(self);

      !hostToGuest.has(h) ||
        Fail`hostToGuest key already bound: ${h} -> ${hostToGuest.get(h)} vs ${g}`;
      guestToHost.init(g, h);
      hostToGuest.init(h, g);
      self.has(g, h) ||
        // separate line so I can set a breakpoint
        Fail`internal: ${g} <-> ${h}`;
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
        toPassableCap(guestToHost.get(g)) === toPassableCap(h) ||
          Fail`internal: g->h ${g} -> ${h} vs ${guestToHost.get(g)}`;
        hostToGuest.get(h) === g ||
          Fail`internal h->g: ${h} -> ${g} vs ${hostToGuest.get(h)}`;
        return true;
      } else {
        !hostToGuest.has(h) ||
          Fail`internal: unexpected h->g ${h} -> ${hostToGuest.get(h)}`;
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
harden(prepareBijection);

/**
 * @typedef {ReturnType<ReturnType<prepareBijection>>} Bijection
 */
