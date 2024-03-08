import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import { prepareErtpService } from '@agoric/ertp/test/swingsetTests/ertpService/vat-ertp-service.js';

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const exportableAmountMath = makeExo(
    'AmountMath',
    M.interface('AmountMath', {}, { defaultGuards: 'passable' }),
    { ...AmountMath },
  );
  const ertpService = prepareErtpService(baggage, vatPowers.exitVatWithFailure);
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      getErtpService: () => ertpService,
      getAmountMath: () => exportableAmountMath,
    },
  );
};
