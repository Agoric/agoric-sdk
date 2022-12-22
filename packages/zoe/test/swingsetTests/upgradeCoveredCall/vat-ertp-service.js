import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import { vivifyErtpService } from '@agoric/ertp/test/swingsetTests/ertpService/vat-ertp-service.js';

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const exportableAmountMath = Far('AmountMath', { ...AmountMath });
  const ertpService = vivifyErtpService(baggage, vatPowers.exitVatWithFailure);
  return Far('root', {
    getErtpService: () => ertpService,
    getAmountMath: () => exportableAmountMath,
  });
};
