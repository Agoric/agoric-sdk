import { AssetKind, prepareIssuerKit } from '@agoric/ertp';
import { provideDurableMapStore } from '@agoric/vat-data';

/**
 * @import {EOnly} from '@endo/eventual-send';
 * @import {MutableQuote, PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {Mint} from '@agoric/ertp';
 * @import {IssuerKit} from '@agoric/ertp';
 */

/**
 *
 * @param {Baggage} baggage
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
