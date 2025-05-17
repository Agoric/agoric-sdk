import { provideLazy as provide } from '@agoric/store';

// Partially duplicates @agoric/vat-data to avoid circular dependencies.
export const makeExoUtils = VatData => {
  const { defineDurableKind, makeKindHandle, watchPromise } = VatData;

  const provideKindHandle = (baggage, kindName) =>
    provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));

  const emptyRecord = harden({});
  const initEmpty = () => emptyRecord;

  const defineDurableExoClass = (
    kindHandle,
    interfaceGuard,
    init,
    methods,
    options,
  ) =>
    defineDurableKind(kindHandle, init, methods, {
      ...options,
      thisfulMethods: true,
      interfaceGuard,
    });

  const prepareExoClass = (
    baggage,
    kindName,
    interfaceGuard,
    init,
    methods,
    options = undefined,
  ) =>
    defineDurableExoClass(
      provideKindHandle(baggage, kindName),
      interfaceGuard,
      init,
      methods,
      options,
    );

  const prepareExo = (
    baggage,
    kindName,
    interfaceGuard,
    methods,
    options = undefined,
  ) => {
    const makeSingleton = prepareExoClass(
      baggage,
      kindName,
      interfaceGuard,
      initEmpty,
      methods,
      options,
    );
    return provide(baggage, `the_${kindName}`, () => makeSingleton());
  };

  return {
    defineDurableKind,
    makeKindHandle,
    watchPromise,

    provideKindHandle,
    defineDurableExoClass,
    prepareExoClass,
    prepareExo,
  };
};
