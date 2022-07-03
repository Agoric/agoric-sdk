// @ts-check

import { Far } from '@endo/marshal';
import { provideErtpService } from '@agoric/ertp/test/swingsetTests/ertpService/vat-ertp-service.js';

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const ertpService = provideErtpService(baggage, vatPowers.exitVatWithFailure);
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
