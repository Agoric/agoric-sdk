/* global HandledPromise */
import { E } from '@agoric/captp';
import { makePromiseKit } from '@agoric/promise-kit';
import { writable } from 'svelte/store';

const walletConnectionPK = makePromiseKit();
export const setWalletConnection = walletConnectionPK.resolve;

export function makeWalletConnection(accessToken, { onReset }) {
  // This is the internal state: a promise kit that doesn't
  // resolve until we are connected.  It is replaced by
  // a new promise kit when we reset our state.
  let bootPK = makePromiseKit();

  // This is the public state, a promise that never resolves,
  // but pipelines messages to the bootPK.promise.
  function makeStableForwarder(fromBootP = x => x) {
    return new HandledPromise((_resolve, _reject, resolveWithPresence) => {
      resolveWithPresence({
        applyMethod(_p, name, args) {
          return E(fromBootP(bootPK.promise))[name](...args);
        },
        get(_p, name) {
          return E(fromBootP(bootPK.promise))[name];
        },
      });
    });
  }

  const connected = writable(false);
  const connect = () => {
    bootPK.resolve(
      E(walletConnectionPK.promise).getAdminBootstrap(accessToken),
    );
    connected.set(true);
  };
  const disconnect = () => {
    // Throw away our state.
    E(walletConnectionPK.promise).reset();
    bootPK = makePromiseKit();
    onReset(bootPK.promise.then(_ => true));
    connected.set(false);
  };

  const connectedExt = { ...connected, connect, disconnect };

  // Prepare the first reset, delayed so that our caller
  // can use makeStableForwarder.
  setTimeout(() => onReset(bootPK.promise), 1);

  return { connected: connectedExt, makeStableForwarder };
}
