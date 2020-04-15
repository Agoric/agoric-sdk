// @ts-check
import { E as defaultE } from '@agoric/eventual-send';
import rawHarden from '@agoric/harden';
import makeStore from '@agoric/store';
import { makeNetworkPeer } from './network';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @typedef {import('./network').Peer} Peer
 * @typedef {import('./network').PeerHandler} PeerHandler
 */

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
/**
 * @typedef {Peer} RoutePeer
 * @property {(prefix: string, peerHandler: PeerHandler) => void} registerPeerHandler
 * @property {(prefix: string, peerHandler: PeerHandler) => void} unregisterPeerHandler
 */

/**
 * Create a router that behaves like a Peer.
 *
 * @param {string} [sep='/'] the route separator
 * @param {typeof defaultE} [E=defaultE] Eventual sender
 */
export function makeRouterPeer(sep = '/', E = defaultE) {
  const router = makeRouter(sep);
  const peers = makeStore('prefix');
  const peerHandlers = makeStore('prefix');

  function registerPeerHandler(prefix, peerHandler) {
    const peer = makeNetworkPeer(peerHandler);
    router.register(prefix, peer);
    peers.init(prefix, peer);
    peerHandlers.init(prefix, peerHandler);
  }

  function unregisterPeerHandler(prefix, peerHandler) {
    const ph = peerHandlers.get(prefix);
    if (ph !== peerHandler) {
      throw TypeError(`Peer handler is not registered at prefix ${prefix}`);
    }
    router.unregister(prefix, ph);
    peers.delete(prefix);
    peerHandlers.delete(prefix);
  }

  /** @type {Peer['bind']} */
  async function bind(localAddr) {
    const [route] = router.getRoutes(localAddr);
    if (route === undefined) {
      throw TypeError(`No registered router for ${localAddr}`);
    }
    return E(route[1]).bind(localAddr);
  }

  return harden({
    bind,
    registerPeerHandler,
    unregisterPeerHandler,
  });
}
