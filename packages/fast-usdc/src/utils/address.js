import { makeError, q } from '@endo/errors';

/**
 * Very minimal 'URL query string'-like parser that handles:
 *  - Query string delimiter (?)
 *  - Key-value separator (=)
 *  - Query parameter separator (&)
 *
 * Does not handle:
 * - Subpaths (`agoric1bech32addr/opt/account?k=v`)
 * - URI encoding/decoding (`%20` -> ` `)
 * - Multiple question marks (foo?bar=1?baz=2)
 * - Empty parameters (foo=)
 * - Array parameters (`foo?k=v1&k=v2` -> k: [v1, v2])
 * - Parameters without values (foo&bar=2)
 */
export const addressTools = {
  /**
   * @param {string} address
   * @returns {boolean}
   */
  hasQueryParams: address => {
    return address.includes('?');
  },
  /**
   * @param {string} address
   * @returns {{ address: string, params: Record<string, string>}}
   */
  getQueryParams: address => {
    const parts = address.split('?');
    if (parts.length === 0 || parts.length > 2) {
      throw makeError(
        `Invalid input. Must be of the form 'address?params': ${q(address)}`,
      );
    }
    const result = {
      address: parts[0],
      params: {},
    };

    // no parameters, return early
    if (parts.length === 1) {
      return result;
    }

    const paramPairs = parts[1].split('&');
    for (const pair of paramPairs) {
      const [key, value] = pair.split('=');
      if (!key || !value) {
        throw makeError(`Invalid parameter format in pair: ${q(pair)}`);
      }
      result.params[key] = value;
    }

    return result;
  },
};
