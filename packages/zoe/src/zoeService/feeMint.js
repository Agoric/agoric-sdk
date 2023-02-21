import {
  makeDurableIssuerKit,
  AssetKind,
  prepareIssuerKit,
  IssuerShape,
  BrandShape,
} from '@agoric/ertp';
import { initEmpty, M } from '@agoric/store';
import {
  provideDurableMapStore,
  provide,
  prepareExoClassKit,
} from '@agoric/vat-data';

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
 */
const prepareFeeMint = (zoeBaggage, feeIssuerConfig, shutdownZoeVat) => {
  const mintBaggage = provideDurableMapStore(zoeBaggage, 'mintBaggage');
  if (!mintBaggage.has(FEE_MINT_KIT)) {
    /** @type {IssuerKit} */
    const feeIssuerKit = makeDurableIssuerKit(
      mintBaggage,
      feeIssuerConfig.name,
      feeIssuerConfig.assetKind,
      feeIssuerConfig.displayInfo,
      shutdownZoeVat,
    );
    mintBaggage.init(FEE_MINT_KIT, feeIssuerKit);
  } else {
    prepareIssuerKit(mintBaggage, shutdownZoeVat);
  }

  const FeeMintIKit = harden({
    feeMint: M.interface('FeeMint', {
      getFeeIssuerKit: M.call(M.remotable('FeeMintAccess')).returns(M.record()),
      getFeeIssuer: M.call().returns(IssuerShape),
      getFeeBrand: M.call().returns(BrandShape),
    }),
    feeMintAccess: M.interface('FeeMintAccess', {}),
  });

  const makeFeeMintKit = prepareExoClassKit(
    mintBaggage,
    'FeeMint',
    FeeMintIKit,
    initEmpty,
    {
      feeMint: {
        getFeeIssuerKit(allegedFeeMintAccess) {
          const { facets } = this;
          assert(
            facets.feeMintAccess === allegedFeeMintAccess,
            'The object representing access to the fee brand mint was not provided',
          );
          return mintBaggage.get(FEE_MINT_KIT);
        },
        getFeeIssuer() {
          return mintBaggage.get(FEE_MINT_KIT).issuer;
        },
        getFeeBrand() {
          return mintBaggage.get(FEE_MINT_KIT).brand;
        },
      },
      // feeMintAccess is an opaque durable object representing the right to get
      // the fee mint.
      feeMintAccess: {},
    },
  );

  return provide(zoeBaggage, 'theFeeMint', () => makeFeeMintKit());
};

export { prepareFeeMint };
