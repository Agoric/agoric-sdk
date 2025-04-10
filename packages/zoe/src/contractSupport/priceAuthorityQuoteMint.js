import { AssetKind, prepareIssuerKit } from '@agoric/ertp';
import { provideDurableMapStore } from '@agoric/vat-data';

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {PriceDescription} from '../../tools/types.js';
 */

/**
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
    { recoverySetsOption: 'noRecoverySets' },
  );
  return issuerKit.mint;
};
