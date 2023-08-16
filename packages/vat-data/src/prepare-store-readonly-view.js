import { objectMap } from '@agoric/internal';
import { M } from '@agoric/store';
import { prepareExoClass } from './exo-utils.js';

const IterableShape = M.remotable('Iterable');

const MapStoreReadonlyViewI = M.interface('MapStoreReadonlyView', {
  has: M.call(M.key()).returns(M.boolean()),
  get: M.call(M.key()).returns(M.any()),
  keys: M.call().optional(M.pattern(), M.pattern()).returns(IterableShape),
  values: M.call().optional(M.pattern(), M.pattern()).returns(IterableShape),
  entries: M.call().optional(M.pattern(), M.pattern()).returns(IterableShape),
  snapshot: M.call().optional(M.pattern(), M.pattern()).returns(M.map()),
  getSize: M.call().optional(M.pattern(), M.pattern()).returns(M.number),
});

const SetStoreReadonlyViewI = M.interface('SetStoreReadonlyView', {
  has: M.call(M.key()).returns(M.boolean()),
  keys: M.call().optional(M.pattern()).returns(IterableShape),
  values: M.call().optional(M.pattern()).returns(IterableShape),
  entries: M.call().optional(M.pattern()).returns(IterableShape),
  snapshot: M.call().optional(M.pattern()).returns(M.map()),
  getSize: M.call().optional(M.pattern()).returns(M.number),
});

const methodsFor = interfaceGuard =>
  objectMap(
    interfaceGuard.methodGuards,
    (_, key) =>
      ({
        [key](...args) {
          const {
            state: { target },
          } = this;
          return target[key](...args);
        },
      }[key]),
  );

const prepareStoneCaster = (baggage, label, interfaceGuard, options = {}) =>
  prepareExoClass(
    baggage,
    label,
    interfaceGuard,
    target => ({ target }),
    methodsFor(interfaceGuard),
    options,
  );

export const prepareMapStoreReadonlyView = baggage =>
  prepareStoneCaster(baggage, 'MapStoreReadonlyView', MapStoreReadonlyViewI);

export const prepareSetStoreReadonlyView = baggage =>
  prepareStoneCaster(baggage, 'SetStoreReadonlyView', SetStoreReadonlyViewI);
