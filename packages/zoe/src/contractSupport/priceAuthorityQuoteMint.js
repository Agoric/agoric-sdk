import { AssetKind, prepareIssuerKit } from '@agoric/ertp';
import { provideDurableMapStore } from '@agoric/vat-data';

/**
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @returns {ERef<Mint<'set', PriceDescription>>}
 */
export const provideQuoteMint = baggage => {
  const issuerBaggage = provideDurableMapStore(
    baggage,
    'quoteMintIssuerBaggage',
  );
  /** @type {IssuerKit<'set', PriceDescription>} */
  // @ts-expect-error cast
  const issuerKit = prepareIssuerKit(
    issuerBaggage,
    'quote',
    AssetKind.SET,
    undefined,
    undefined,
    { recoverySetsOption: 'noRecoverySets' },
  );
  return issuerKit.mint;
};
