// @ts-check

import { Far } from '@endo/marshal';
import {
  makeScalarBigMapStore,
  ProvideFar,
  provideDurableSetStore,
} from '@agoric/vat-data';

import {
  AssetKind,
  makeDurableIssuerKit,
  provideDurableIssuerKit,
} from '../../../src';

function provideErtpService(baggage, exitVatWithFailure) {
  const issuerBaggageSet = provideDurableSetStore(baggage, 'BaggageSet');
  const ertpService = ProvideFar(baggage, 'ERTPService', {
    makeIssuerKit: (
      allegedName,
      assetKind = AssetKind.NAT,
      displayInfo = harden({}),
    ) => {
      const issuerBaggage = makeScalarBigMapStore('IssuerBaggage', {
        durable: true,
      });
      const issuerKit = makeDurableIssuerKit(
        issuerBaggage,
        allegedName,
        assetKind,
        displayInfo,
        exitVatWithFailure,
      );
      issuerBaggageSet.add(issuerBaggage);

      return issuerKit;
    },
  });

  for (const issuerBaggage of issuerBaggageSet.values()) {
    provideDurableIssuerKit(issuerBaggage);
  }

  return ertpService;
}

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const ertpService = provideErtpService(baggage, vatPowers.exitVatWithFailure);
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
