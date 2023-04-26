import { makeKindHandle, makeScalarBigMapStore } from '@agoric/vat-data';

export const provideHandle = (baggage, name, iface) => {
  if (!baggage.has(name)) {
    baggage.init(name, makeKindHandle(iface));
  }
  return baggage.get(name);
};

export const provideBaggageSubset = (baggage, name) => {
  if (!baggage.has(name)) {
    // TODO: maybe string keys
    baggage.init(name, makeScalarBigMapStore(name, { durable: true }));
  }
  return baggage.get(name);
};
