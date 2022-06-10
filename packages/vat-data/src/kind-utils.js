import { provide } from '@agoric/store';
import {
  defineDurableKind,
  defineDurableKindMulti,
  makeKindHandle,
} from './vat-data-bindings.js';

export const provideKindHandle = (baggage, kindName) =>
  provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
// @ts-expect-error TODO statically recognize harden
harden(provideKindHandle);

export const provideDurableSingleton = (
  baggage,
  kindName,
  behavior,
  options = undefined,
) => {
  const kindHandle = provideKindHandle(baggage, kindName);
  const makeSingleton = defineDurableKind(
    kindHandle,
    () => ({}),
    behavior,
    options,
  );
  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
// @ts-expect-error TODO statically recognize harden
harden(provideDurableSingleton);

export const provideDurableSingletonKit = (
  baggage,
  kindName,
  behaviorFacets,
  options = undefined,
) => {
  const kindHandle = provideKindHandle(baggage, kindName);
  const makeSingletonKit = defineDurableKindMulti(
    kindHandle,
    () => ({}),
    behaviorFacets,
    options,
  );
  return provide(baggage, `the_${kindName}`, () => makeSingletonKit());
};
// @ts-expect-error TODO statically recognize harden
harden(provideDurableSingletonKit);

export const dropContext =
  fn =>
  (_, ...args) =>
    fn(...args);
// @ts-expect-error TODO statically recognize harden
harden(dropContext);
