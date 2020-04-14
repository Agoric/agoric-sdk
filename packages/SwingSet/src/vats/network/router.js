// @ts-check
import makeStore from '@agoric/store';
import rawHarden from '@agoric/harden';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @template T,U
 * @typedef {import('@agoric/store').Store<T,U>} Store
 */

/**
 * @typedef {Object} Router A delimited string router implementation
 * @property {(addr: string) => [string, any][]} getRoutes Return the match and route in order of preference
 * @property {(prefix: string, route: any) => void} register Add a prefix->route to the database
 * @property {(prefix: string, route: any) => void} unregister Remove a prefix->route from the database
 */

/**
 * Create a slash-delimited router.
 *
 * @param {string} [sep='/'] the delimiter of the routing strings
 * @returns {Router} a new Router
 */
export default function makeRouter(sep = '/') {
  /**
   * @type {Store<string, any>}
   */
  const prefixToRoute = makeStore('prefix');
  return harden({
    getRoutes(addr) {
      const parts = addr.split('/');
      /**
       * @type {[string, any][]}
       */
      const ret = [];
      for (let i = parts.length; i > 0; i -= 1) {
        // Try most specific match.
        const prefix = parts.slice(0, i).join(sep);
        if (prefixToRoute.has(prefix)) {
          ret.push([prefix, prefixToRoute.get(prefix)]);
        }
        // Trim off the last value (after the slash).
        const defaultPrefix = prefix.substr(0, prefix.lastIndexOf('/') + 1);
        if (prefixToRoute.has(defaultPrefix)) {
          ret.push([defaultPrefix, prefixToRoute.get(defaultPrefix)]);
        }
      }
      return harden(ret);
    },
    register(prefix, route) {
      prefixToRoute.init(prefix, route);
    },
    unregister(prefix, route) {
      if (prefixToRoute.get(prefix) !== route) {
        throw TypeError(`Router is not registered at prefix ${prefix}`);
      }
      prefixToRoute.delete(prefix);
    },
  });
}
