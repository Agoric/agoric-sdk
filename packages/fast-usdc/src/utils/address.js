import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {Pattern} from '@endo/patterns';
 */

/**
 * Default pattern matcher for `getQueryParams`.
 * Does not assert keys exist, but ensures existing keys are strings.
 */
const QueryParamsShape = M.splitRecord(
  {},
  {},
  M.recordOf(M.string(), M.string()),
);

/**
 * Very minimal 'URL query string'-like parser that handles:
 *  - Query string delimiter (?)
 *  - Key-value separator (=)
 *  - Query parameter separator (&)
 *
 * Does not handle:
 * - Subpaths (`agoric1bech32addr/opt/account?k=v`)
 * - URI encoding/decoding (`%20` -> ` `)
 *    - note: `decodeURIComponent` seems to be available in XS
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
    try {
      const params = addressTools.getQueryParams(address);
      return Object.keys(params).length > 0;
    } catch {
      return false;
    }
  },
  /**
   * @param {string} address
   * @param {Pattern} [shape]
   * @returns {Record<string, string>}
   * @throws {Error} if the address cannot be parsed or params do not match `shape`
   */
  getQueryParams: (address, shape = QueryParamsShape) => {
    const parts = address.split('?');
    if (parts.length !== 2) {
      throw makeError(`Unable to parse query params: ${q(address)}`);
    }
    /** @type {Record<string, string>} */
    const result = {};
    const paramPairs = parts[1].split('&');
    for (const pair of paramPairs) {
      const [key, value] = pair.split('=');
      if (!key || !value) {
        throw makeError(`Invalid parameter format in pair: ${q(pair)}`);
      }
      result[key] = value;
    }
    harden(result);
    mustMatch(result, shape);
    return result;
  },
};
