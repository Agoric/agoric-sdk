import { b, Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { Far, isPassable } from '@endo/pass-style';
import { toPassableCap } from '@agoric/vow';
import { makeEphemera } from './ephemera.js';

/**
 * @import {PassableCap} from '@endo/pass-style'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Vow} from '@agoric/vow'
 * @import {Ephemera} from './types.js';
 */

const BijectionI = M.interface('Bijection', {
  reset: M.call().returns(),
  unwrapInit: M.call(M.raw(), M.any()).returns(M.raw()),
  hasGuest: M.call(M.raw()).returns(M.boolean()),
  hasHost: M.call(M.any()).returns(M.boolean()),
  has: M.call(M.raw(), M.any()).returns(M.boolean()),
  guestToHost: M.call(M.raw()).returns(M.any()),
  hostToGuest: M.call(M.any()).returns(M.raw()),
});

/**
 * @param {unknown} k
 */
const toKey = k =>
  // @ts-expect-error k specificity
  isPassable(k) ? toPassableCap(k) : k;

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
      const k2 = toKey(k);
      !map.has(k2) ||
        // separate line so I can set a breakpoint
        Fail`${b(name)} key already bound: ${k} -> ${map.get(k2)} vs ${v}`;
      map.set(k2, v);
    },
    has: k => map.has(toKey(k)),
    get: k => {
      const k2 = toKey(k);
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
 * @param {(hostWrapper: PassableCap | Vow, guestWrapper: PassableCap) => unknown} [unwrap]
 *  defaults to identity function on `guestWrapper` arg
 */
export const prepareBijection = (
  zone,
  unwrap = (_hostWrapper, guestWrapper) => guestWrapper,
) => {
  /** @type {Ephemera<Bijection, VowishStore>} */
  const g2h = makeEphemera(() => makeVowishStore('guestToHost'));
  /** @type {Ephemera<Bijection, VowishStore>} */
  const h2g = makeEphemera(() => makeVowishStore('hostToGuest'));

  // Guest arguments are results are now unguarded, i.e., guarded by `M.raw()`,
  // so that they can be non-passables. Therefore, we need to harden these
  // here.
  return zone.exoClass('Bijection', BijectionI, () => ({}), {
    reset() {
      const { self } = this;

      g2h.resetFor(self);
      h2g.resetFor(self);
    },
    unwrapInit(g, h) {
      harden(g);
      const { self } = this;
      const guestToHost = g2h.for(self);
      const hostToGuest = h2g.for(self);

      const gUnwrapped = unwrap(h, g);
      !hostToGuest.has(h) ||
        Fail`hostToGuest key already bound: ${h} -> ${hostToGuest.get(h)} vs ${gUnwrapped}`;
      guestToHost.init(gUnwrapped, h);
      hostToGuest.init(h, gUnwrapped);
      self.has(gUnwrapped, h) ||
        // separate line so I can set a breakpoint
        Fail`internal: ${g} <-> ${h}`;
      if (g !== gUnwrapped) {
        // When they are different, also map g to h without mapping h to g
        !guestToHost.has(g) ||
          // separate line so I can set a breakpoint
          Fail`hidden guest wrapper already bound ${g}`;
        guestToHost.init(g, h);
      }
      return gUnwrapped;
    },
    hasGuest(g) {
      harden(g);
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
      harden(g);
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
      harden(g);
      const { self } = this;
      const guestToHost = g2h.for(self);

      return guestToHost.get(g);
    },
    hostToGuest(h) {
      const { self } = this;
      const hostToGuest = h2g.for(self);

      // Even though result is unguarded, i.e., guarded by `M.raw()`, don't
      // need to harden here because was already harden when added to
      // collection.
      return hostToGuest.get(h);
    },
  });
};
harden(prepareBijection);

/**
 * @typedef {ReturnType<ReturnType<prepareBijection>>} Bijection
 */
