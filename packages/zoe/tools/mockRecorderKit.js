import {
  makeFakeMarshaller,
  makeFakeStorage,
} from '@agoric/notifier/tools/testSupports.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { prepareRecorderKitMakers } from '../src/contractSupport/recorder.js';

/** For use in tests */
export const prepareMockRecorderKitMakers = () => {
  const baggage = makeScalarBigMapStore('mock recorder baggage');
  const marshaller = makeFakeMarshaller();
  return {
    ...prepareRecorderKitMakers(baggage, marshaller),
    storageNode: makeFakeStorage('mock recorder storage'),
  };
};
harden(prepareMockRecorderKitMakers);
