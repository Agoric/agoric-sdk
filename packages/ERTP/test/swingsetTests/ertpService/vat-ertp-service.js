import { Far } from '@endo/marshal';
import {
  makeScalarBigMapStore,
  prepareSingleton,
  provideDurableSetStore,
} from '@agoric/vat-data';

import {
  AssetKind,
  makeDurableIssuerKit,
  upgradeIssuerKit,
} from '../../../src/index.js';

export const prepareErtpService = baggage => {
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
      );
      issuerBaggageSet.add(issuerBaggage);

      return issuerKit;
    },
  });

  for (const issuerBaggage of issuerBaggageSet.values()) {
    upgradeIssuerKit(issuerBaggage);
  }

  return ertpService;
};
harden(prepareErtpService);

export const buildRootObject = async (_vatPowers, _vatParams, baggage) => {
  const ertpService = prepareErtpService(baggage);
  return Far('root', {
    getErtpService: () => ertpService,
  });
};
