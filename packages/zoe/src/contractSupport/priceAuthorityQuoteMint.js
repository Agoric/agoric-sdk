import { AssetKind, prepareIssuerKit } from '@agoric/ertp';
import { provideDurableMapStore } from '@agoric/vat-data';

/**
 * @import {EOnly} from '@endo/eventual-send';
 * @import {MutableQuote, PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {Mint} from '@agoric/ertp';
 * @import {IssuerKit} from '@agoric/ertp';
 * @import {ERef} from '@agoric/vow';
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
  const issuerKit = /** @type {IssuerKit<'set', PriceDescription>} */ (
    prepareIssuerKit(
      issuerBaggage,
      'quote',
      AssetKind.SET,
      undefined,
      undefined,
      { recoverySetsOption: 'noRecoverySets' },
    )
  );
  return issuerKit.mint;
};
