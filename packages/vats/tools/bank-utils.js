// @ts-check
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeScalarMapStore } from '@agoric/vat-data';
import { E } from '@endo/far';
import { Far } from '@endo/marshal';

/** @param {Pick<IssuerKit, 'brand' | 'issuer'>[]} issuerKits */
export const makeFakeBankKit = issuerKits => {
  /** @type {MapStore<Brand, ERef<Issuer>>} */
  const issuers = makeScalarMapStore();
  /**
   * @type {MapStore<
   *   Brand,
   *   ERef<import('../src/vat-bank.js').VirtualPurse>
   * >}
   */
  const purses = makeScalarMapStore();

  // XXX setup purses without publishing
  issuerKits.forEach(kit => issuers.init(kit.brand, kit.issuer));
  issuerKits.forEach(kit => {
    assert(kit.issuer);
    purses.init(kit.brand, E(kit.issuer).makeEmptyPurse());
  });

  /**
   * @type {SubscriptionRecord<
   *   import('../src/vat-bank.js').AssetDescriptor
   * >}
   */
  const { subscription, publication } = makeSubscriptionKit();

  /**
   * @param {string} denom lower-level denomination string
   * @param {string} issuerName
   * @param {string} proposedName
   * @param {import('../src/vat-bank.js').AssetIssuerKit} kit ERTP issuer kit
   */
  const addAsset = (denom, issuerName, proposedName, kit) => {
    issuers.init(kit.brand, kit.issuer);
    purses.init(kit.brand, E(kit.issuer).makeEmptyPurse());
    publication.updateState({
      ...kit,
      denom,
      issuerName,
      proposedName,
    });
  };

  /** @type {import('../src/vat-bank.js').Bank} */
  const bank = Far('mock bank', {
    /** @param {Brand} brand */
    getPurse: async brand => purses.get(brand),
    getAssetSubscription: () => subscription,
  });

  return { addAsset, assetPublication: publication, bank };
};
