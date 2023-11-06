import { AssetKind, prepareIssuerKit } from '@agoric/ertp';
import { provideDurableMapStore } from '@agoric/vat-data';

/**
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @returns {ERef<Mint<'set'>>}
 */
export const provideQuoteMint = baggage => {
  const issuerBaggage = provideDurableMapStore(
    baggage,
    'quoteMintIssuerBaggage',
  );
  const issuerKit = prepareIssuerKit(
    issuerBaggage,
    'quote',
    AssetKind.SET,
    undefined,
    undefined,
  );
  return issuerKit.mint;
};
