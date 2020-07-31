import { writable } from 'svelte/store';
import { makeCapTP, E, HandledPromise } from '@agoric/captp';
import { producePromise } from '@agoric/produce-promise';
import { makeWebSocket } from './websocket';

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  return [{ subscribe: store.subscribe }, store.set];
}

// INITALIZATION

// Get some properties of the bootstrap object.
export const walletP = makePermanentPresence('wallet');
export const boardP = makePermanentPresence('board');

const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);
const [dapps, setDapps] = makeReadable([]);
const [payments, setPayments] = makeReadable([]);
const [issuers, setIssuers] = makeReadable([]);

export { inbox, purses, dapps, payments, issuers };

function resetClientState() {
  // Set up our subscriptions.
  adaptNotifierUpdates(E(walletP).getPursesNotifier(), pjs => setPurses(JSON.parse(pjs)));
  adaptNotifierUpdates(E(walletP).getInboxNotifier(), ijs => setInbox(JSON.parse(ijs)));
  adaptNotifierUpdates(E(walletP).getDappRecordNotifier(), setDapps)
}

// LIBRARY - captp adaptation

async function adaptNotifierUpdates(notifier, observer) {
  let lastUpdateCount = 0;
  while (lastUpdateCount !== undefined) {
    const prior = lastUpdateCount;
    const { value, updateCount } = await E(notifier).getUpdateSince(prior);
    observer(value);
    lastUpdateCount = updateCount;
  }
}

// This is the internal state: a promise kit that doesn't
// resolve until we are connected.  It is replaced by
// a new promise kit when we reset our state.
let homePK = producePromise();
let dispatch;
let abort;

function onMessage(event) {
  const obj = JSON.parse(event.data);
  dispatch(obj);
}

function onClose(event)  {
  // Throw away our state.
  homePK = producePromise();
  resetClientState();
  abort();
}

async function onOpen(event) {
  const { abort: ctpAbort, dispatch: ctpDispatch, getBootstrap } =
    makeCapTP('@agoric/wallet-frontend', sendMessage);
  abort = ctpAbort;
  dispatch = ctpDispatch;

  // Wait for the other side to finish loading.
  await E.G(getBootstrap()).LOADING;

  // Begin the flow of messages to our wallet, which
  // we refetch from the new, loaded, bootstrap object.
  const homePresence = getBootstrap();
  
  homePK.resolve(homePresence);
}

// This is the public state, a promise that never resolves,
// but pipelines messages to the homePK.promise.
function makePermanentPresence(prop) {
  return new HandledPromise((_resolve, _reject, resolveWithPresence) => {
    resolveWithPresence({
      applyMethod(_p, name, args) {
        return E(E.G(homePK.promise)[prop])[name](...args);
      },
      get(_p, name) {
        return E(E.G(homePK.promise)[prop])[name];
      },
    });
  });
}

resetClientState();
const { connected, sendMessage } = makeWebSocket('/private/captp', { onOpen, onMessage, onClose })

export { connected };
