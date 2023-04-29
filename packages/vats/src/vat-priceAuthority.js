import { provide } from '@agoric/vat-data';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { Far } from '@endo/marshal';

/**
 * Vat holding the canonical PriceAuthorityRegistry for looking up prices on any
 * registered tuple of brands.
 *
 * @param {VatPowers} _vatPowers
 * @param {unknown} _vatParams
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export function buildRootObject(_vatPowers, _vatParams, baggage) {
  const registry = provide(baggage, 'priceAuthorityRegistry', () =>
    makePriceAuthorityRegistry(baggage),
  );
  return Far('root', { getRegistry: () => registry });
}
