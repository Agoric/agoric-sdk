// @ts-check

import { Far } from '@endo/marshal';
import { vivifyErtpService } from '@agoric/ertp/test/swingsetTests/ertpService/vat-ertp-service.js';
import { vivifyRootPorter } from '@agoric/vat-data';

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const rootPorter = vivifyRootPorter(baggage);
  const ertpService = vivifyErtpService(
    rootPorter,
    vatPowers.exitVatWithFailure,
  );
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
