/* global HandledPromise */
import { makeCapTP, E } from '@agoric/captp';
import { makePromiseKit } from '@agoric/promise-kit';

export function makeCapTPConnection(makeConnection, { onReset }) {

  // This is the internal state: a promise kit that doesn't
  // resolve until we are connected.  It is replaced by
  // a new promise kit when we reset our state.
  let bootPK = makePromiseKit();
  let dispatch;
  let abort;

  // Stable identity for the connection handler.
  function onMessage(event) {
    const obj = JSON.parse(event.data);
    dispatch(obj);
  }

  // Stable identity for the connection handler.
  function onClose(_event)  {
    // Throw away our state.
    bootPK = makePromiseKit();
    onReset(bootPK.promise.then(_ => true));
    abort();
  }

  // Stable identity for the connection handler.
  async function onOpen(event) {
    const { abort: ctpAbort, dispatch: ctpDispatch, getBootstrap } =
      makeCapTP('@agoric/dapp-svelte-wallet-ui', sendMessage);
    abort = ctpAbort;
    dispatch = ctpDispatch;

    // Wait for the other side to finish loading.
    await E.G(getBootstrap()).LOADING;

    // Begin the flow of messages to our wallet, which
    // we refetch from the new, loaded, bootstrap promise.
    bootPK.resolve(getBootstrap());
  }

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

  const props = makeConnection({ onOpen, onMessage, onClose });
  const { sendMessage } = props;

  // Prepare the first reset, delayed so that our caller
  // can use makePermanentPresence.
  setTimeout(() => onReset(bootPK.promise), 1);

  return { makeStableForwarder, ...props };
}
