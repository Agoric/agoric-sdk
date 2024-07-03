import {
  AssetKind,
  IssuerShape,
  BrandShape,
  prepareIssuerKit,
  hasIssuer,
} from '@agoric/ertp';
import { initEmpty, M } from '@agoric/store';
import {
  provideDurableMapStore,
  provide,
  prepareExoClassKit,
} from '@agoric/vat-data';
import { Fail, q } from '@endo/errors';
import { FeeMintAccessShape } from '../typeGuards.js';

/** @deprecated Redundant. Just omit it. */
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
 * @param {import('@agoric/swingset-vat').ShutdownWithFailure} shutdownZoeVat
 */
const prepareFeeMint = (zoeBaggage, feeIssuerConfig, shutdownZoeVat) => {
  const mintBaggage = provideDurableMapStore(zoeBaggage, 'mintBaggage');
  if (mintBaggage.has(FEE_MINT_KIT)) {
    hasIssuer(mintBaggage) ||
      Fail`Legacy ${q(
        FEE_MINT_KIT,
      )} must be redundant with normal storing of issuerKit in issuerBaggage`;
    // Upgrade this legacy state by simply deleting it.
    mintBaggage.delete(FEE_MINT_KIT);
  }

  const feeIssuerKit = /** @type {IssuerKit<'nat'>} */ (
    prepareIssuerKit(
      mintBaggage,
      feeIssuerConfig.name,
      feeIssuerConfig.assetKind,
      feeIssuerConfig.displayInfo,
      shutdownZoeVat,
    )
  );

  const FeeMintIKit = harden({
    feeMint: M.interface('FeeMint', {
      getFeeIssuerKit: M.call(FeeMintAccessShape).returns(M.record()),
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
          facets.feeMintAccess === allegedFeeMintAccess ||
            Fail`The object representing access to the fee brand mint was not provided`;
          return feeIssuerKit;
        },
        getFeeIssuer() {
          return feeIssuerKit.issuer;
        },
        getFeeBrand() {
          return feeIssuerKit.brand;
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
