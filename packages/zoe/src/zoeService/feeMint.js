// @ts-check

import { makeDurableIssuerKit, AssetKind } from '@agoric/ertp';
import { initEmpty } from '@agoric/store';
import { vivifyKindMulti, provideDurableMapStore } from '@agoric/vat-data';

const FEE_MINT_KIT = 'FeeMintKit';

export const defaultFeeIssuerConfig = harden(
  /** @type {const} */ ({
    name: 'ZDEFAULT',
    assetKind: AssetKind.NAT,
    displayInfo: harden({ decimalPlaces: 6, assetKind: AssetKind.NAT }),
  }),
);

/**
 * @param {import('@agoric/vat-data').Baggage} zoeBaggage
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @param {ShutdownWithFailure} shutdownZoeVat
 * @returns {{
 *    getFeeMintAccessToken: () => FeeMintAccess,
 *    getFeeIssuerKit: GetFeeIssuerKit,
 *    getFeeIssuer: () => Issuer,
 *    getFeeBrand: () => Brand,
 * }}
 */
const vivifyFeeMint = (zoeBaggage, feeIssuerConfig, shutdownZoeVat) => {
  const mintBaggage = provideDurableMapStore(zoeBaggage, 'mintBaggage');
  if (!zoeBaggage.has(FEE_MINT_KIT)) {
    /** @type {IssuerKit} */
    const feeIssuerKit = makeDurableIssuerKit(
      mintBaggage,
      feeIssuerConfig.name,
      feeIssuerConfig.assetKind,
      feeIssuerConfig.displayInfo,
      shutdownZoeVat,
    );
    mintBaggage.init(FEE_MINT_KIT, feeIssuerKit);
  }

  const getFeeIssuerKit = ({ facets }, allegedFeeMintAccess) => {
    assert(
      facets.feeMintAccess === allegedFeeMintAccess,
      'The object representing access to the fee brand mint was not provided',
    );
    return mintBaggage.get(FEE_MINT_KIT);
  };

  const makeFeeMintKit = vivifyKindMulti(mintBaggage, 'FeeMint', initEmpty, {
    feeMint: {
      getFeeIssuerKit,
      getFeeMintAccessToken: ({ facets }) => facets.feeMintAccess,
      getFeeIssuer: () => mintBaggage.get(FEE_MINT_KIT).issuer,
      getFeeBrand: () => mintBaggage.get(FEE_MINT_KIT).brand,
    },
    // feeMintAccess is an opaque durable object representing the right to get
    // the fee mint.
    feeMintAccess: {},
  });

  const { feeMint } = makeFeeMintKit();
  return feeMint;
};

export { vivifyFeeMint };
