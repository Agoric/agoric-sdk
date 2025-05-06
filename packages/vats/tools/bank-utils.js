import { makeSubscriptionKit } from '@agoric/notifier';
import { makeScalarBigMapStore, makeScalarMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/far';
import { Far } from '@endo/marshal';
import { buildRootObject as buildBankVatRoot } from '../src/vat-bank.js';
import { FAUCET_ADDRESS, makeFakeBankBridge } from './fake-bridge.js';

/**
 * @deprecated use makeFakeBankManagerKit
 * @param {Pick<IssuerKit<'nat'>, 'brand' | 'issuer'>[]} issuerKits
 */
export const makeFakeBankKit = issuerKits => {
  /** @type {MapStore<Brand, Issuer>} */
  const issuers = makeScalarMapStore();
  /**
   * @type {MapStore<
   *   Brand,
   *   ERef<import('../src/vat-bank.js').VirtualPurse>
   * >}
   */
  const purses = makeScalarMapStore();

  // XXX setup purses without publishing
  for (const kit of issuerKits) {
    assert(kit.issuer);
    issuers.init(kit.brand, kit.issuer);
    purses.init(kit.brand, E(kit.issuer).makeEmptyPurse());
  }

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

/**
 * @param {object} [opts]
 * @param {import('./fake-bridge.js').Balances} [opts.balances] initial balances
 * @param {(obj) => unknown} [opts.onToBridge] handler for toBridge messages
 */
export const makeFakeBankManagerKit = async opts => {
  const baggage = makeScalarBigMapStore('baggage');
  const zone = makeDurableZone(baggage);

  const bankManager = await buildBankVatRoot(
    undefined,
    undefined,
    zone.mapStore('bankManager'),
  ).makeBankManager(makeFakeBankBridge(zone, opts));

  /**
   * Get a payment from the faucet
   *
   * @param {Amount<'nat'>} amount
   * @returns {Promise<Payment<'nat'>>}
   */
  const pourPayment = async amount => {
    const faucet = await E(bankManager).getBankForAddress(FAUCET_ADDRESS);
    const purse = await E(faucet).getPurse(amount.brand);
    return E(purse).withdraw(amount);
  };

  return { bankManager, pourPayment };
};
