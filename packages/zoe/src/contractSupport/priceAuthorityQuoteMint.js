import {
  AssetKind,
  makeDurableIssuerKit,
  prepareIssuerKit,
} from '@agoric/ertp';
import { makeScalarBigMapStore } from '@agoric/vat-data';

/**
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const provideQuoteMint = baggage => {
  /** @type {ERef<Mint<'set'>>} */
  let baggageQuoteMint;
  if (baggage.has(`quoteMintIssuerBaggage`)) {
    const issuerBaggage = baggage.get(`quoteMintIssuerBaggage`);
    baggageQuoteMint = /** @type {Mint<'set'>} */ (
      prepareIssuerKit(issuerBaggage).mint
    );
  } else {
    const issuerBaggage = makeScalarBigMapStore(
      `scaledPriceAuthority quoteMintIssuerBaggage`,
      { durable: true },
    );
    baggage.init(`quoteMintIssuerBaggage`, issuerBaggage);
    baggageQuoteMint = makeDurableIssuerKit(
      issuerBaggage,
      'quote',
      AssetKind.SET,
    ).mint;
  }

  return baggageQuoteMint;
};
