// @ts-check
import { provide } from '@agoric/store';
import { defineDurableKindMulti, makeKindHandle } from '@agoric/vat-data';

export const provideFakeNotifierKit = baggage => {
  const notifierKitKindHandle = provide(baggage, 'notifierKitKindHandle', () =>
    makeKindHandle('notifier'),
  );
  const makeFakeNotifierKit = defineDurableKindMulti(
    notifierKitKindHandle,
    _initialState => ({}),
    {
      notifier: {
        // [Symbol.asyncIterator]: () => ({}),
        getUpdateSince: (_context, _updateCount = NaN) => harden({}),
      },
      updater: {
        updateState: (_context, _notifierState) => {},
        finish: (_context, _finalState) => {},
        fail: (_context, _reason) => {},
      },
    },
  );
  return makeFakeNotifierKit;
};
