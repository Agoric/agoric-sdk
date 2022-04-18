import { makeLegacyWeakMap } from '../legacy/legacyWeakMap.js';
import { defendVTable } from './interface-tools.js';

const { create, freeze, seal } = Object;

export const defineHeapKind = (
  ifaceGuard,
  init,
  rawVTable,
  { finish = undefined } = {},
) => {
  if (typeof ifaceGuard === 'string') {
    ifaceGuard = harden({
      klass: 'Interface',
      farName: ifaceGuard,
      methodGuards: {},
    });
  }
  const { klass } = ifaceGuard;
  assert(klass === 'Interface');
  // legacyWeakMap to avoid hardening state
  const contextMapStore = makeLegacyWeakMap();
  const defensiveVTable = defendVTable(rawVTable, contextMapStore, ifaceGuard);
  const makeInstance = (...args) => {
    // Don't freeze state
    const state = seal(init(...args));
    const self = harden(create(defensiveVTable));
    const context = freeze({ state, self });
    contextMapStore.init(self, context);
    if (finish) {
      finish(context);
    }
    return self;
  };
  return harden(makeInstance);
};
harden(defineHeapKind);
