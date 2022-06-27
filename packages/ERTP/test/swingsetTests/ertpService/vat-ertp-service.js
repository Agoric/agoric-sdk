// @ts-check

import { Far } from '@endo/marshal';
import {
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  ProvideFar,
} from '@agoric/vat-data/src';
import { provide } from '@agoric/store';

import {
  AssetKind,
  makeDurableIssuerKit,
  provideDurableIssuerKit,
} from '../../../src';

function makeErtpService(baggage, exitVatWithFailure) {
  const didStart = baggage.has('didStart'); // false for v1, true for v2

  const issuerBaggageSet = provide(baggage, 'BaggageSet', () => {
    baggage.init('didStart', true);
    return makeScalarBigSetStore('BaggageSet', {
      durable: true,
    });
  });

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

  if (didStart) {
    console.log(`DID START`);
    for (const issuerBaggage of issuerBaggageSet.values()) {
      provideDurableIssuerKit(issuerBaggage);
    }
  }

  return ertpService;
}

export const buildRootObject = async (vatPowers, _vatParams, baggage) => {
  const ertpService = makeErtpService(baggage, vatPowers.exitVatWithFailure);
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
