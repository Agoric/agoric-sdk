import { Far } from '@endo/marshal';
import {
  makeScalarBigMapStore,
  prepareSingleton,
  provideDurableSetStore,
} from '@agoric/vat-data';

import {
  AssetKind,
  makeDurableIssuerKit,
  prepareIssuerKit,
} from '../../../src';

export const prepareErtpService = (baggage, exitVatWithFailure) => {
  const issuerBaggageSet = provideDurableSetStore(baggage, 'BaggageSet');
  const ertpService = prepareSingleton(baggage, 'ERTPService', {
    makeIssuerKit: (
      name,
      assetKind = AssetKind.NAT,
      displayInfo = harden({}),
    ) => {
      const issuerBaggage = makeScalarBigMapStore('IssuerBaggage', {
        durable: true,
      });
      const issuerKit = makeDurableIssuerKit(
        issuerBaggage,
        name,
        assetKind,
        displayInfo,
        exitVatWithFailure,
      );
      issuerBaggageSet.add(issuerBaggage);

      return issuerKit;
    },
  });

  for (const issuerBaggage of issuerBaggageSet.values()) {
    prepareIssuerKit(issuerBaggage);
  }

  return ertpService;
};
harden(prepareErtpService);

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const ertpService = prepareErtpService(baggage, vatPowers.exitVatWithFailure);
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
