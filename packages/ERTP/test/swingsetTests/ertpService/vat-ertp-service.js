// @ts-check

import { Far } from '@endo/marshal';
import { makeScalarBigMapStore, vivifyRootPorter } from '@agoric/vat-data';

import { AssetKind, makeDurableIssuerKit, vivifyIssuerKit } from '../../../src';

/** @typedef {import('@agoric/vat-data').Porter} Porter */

/**
 * @param {Porter} porter
 * @param {(reason: Error) => never} exitVatWithFailure
 */
export const vivifyErtpService = (porter, exitVatWithFailure) => {
  const issuerPorterSet = porter.provideSetStore('PorterSet');
  const ertpService = porter.vivifySingleton('ERTPService', {
    makeIssuerKit: (
      name,
      assetKind = AssetKind.NAT,
      displayInfo = harden({}),
    ) => {
      const issuerBaggage = makeScalarBigMapStore('IssuerBaggage', {
        durable: true,
      });
      const issuerPorter = porter.makeFreshPorter(issuerBaggage);
      const issuerKit = makeDurableIssuerKit(
        issuerPorter,
        name,
        assetKind,
        displayInfo,
        exitVatWithFailure,
      );
      issuerPorterSet.add(issuerPorter);

      return issuerKit;
    },
  });

  for (const issuerPorter of issuerPorterSet.values()) {
    vivifyIssuerKit(issuerPorter);
  }

  return ertpService;
};
harden(vivifyErtpService);

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
