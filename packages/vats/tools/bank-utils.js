// @ts-check
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeScalarMapStore } from '@agoric/vat-data';
import { E } from '@endo/far';
import { Far } from '@endo/marshal';

/**
 * @param {Array<Pick<IssuerKit, 'brand' | 'issuer'>>} issuerKits
 */
export const makeFakeBankKit = issuerKits => {
  const issuers = makeScalarMapStore();
  issuerKits.forEach(kit => issuers.init(kit.brand, kit.issuer));
  const purses = makeScalarMapStore();
  issuerKits.forEach(kit => {
    assert(kit.issuer);
    purses.init(kit.brand, E(kit.issuer).makeEmptyPurse());
  });

  /** @type {SubscriptionRecord<import('../src/vat-bank.js').AssetDescriptor>} */
  const { subscription, publication } = makeSubscriptionKit();

  /** @type {import('../src/vat-bank.js').Bank} */
  const bank = Far('mock bank', {
    /** @param {Brand} brand */
    getPurse: brand => purses.get(brand),
    getAssetSubscription: () => subscription,
  });

  return { assetPublication: publication, bank };
};
