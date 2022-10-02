import { Far } from '@endo/marshal';
import {
  makeScalarBigMapStore,
  vivifySingleton,
  provideDurableSetStore,
} from '@agoric/vat-data';

import { AssetKind, makeDurableIssuerKit, vivifyIssuerKit } from '../../../src';

export const vivifyErtpService = (baggage, exitVatWithFailure) => {
  const issuerBaggageSet = provideDurableSetStore(baggage, 'BaggageSet');
  const ertpService = vivifySingleton(baggage, 'ERTPService', {
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
    vivifyIssuerKit(issuerBaggage, exitVatWithFailure);
  }

  return ertpService;
};
harden(vivifyErtpService);

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const ertpService = vivifyErtpService(baggage, vatPowers.exitVatWithFailure);
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
