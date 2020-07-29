import { writable } from 'svelte/store';
import { makeCapTP, E, HandledPromise } from '@agoric/captp';
import { producePromise } from '@agoric/produce-promise';
import { makeWebSocket } from './websocket';

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  return [{ subscribe: store.subscribe }, store.set];
}

const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);

// INITALIZATION

// This is the internal state: a promise kit that doesn't
// resolve until we are connected.  It is replaced by
// a new promise kit when we reset our state.
let walletPK;
function resetClientState() {
  walletPK = producePromise();

  // Set up our subscriptions.
  adaptNotifierUpdates(E(walletP).getPursesNotifier(), pjs => setPurses(JSON.parse(pjs)));
  adaptNotifierUpdates(E(walletP).getInboxNotifier(), ijs => setInbox(JSON.parse(ijs)));
}

// LIBRARY - captp adaptation

function adaptNotifierUpdates(notifier, observer) {
  function handleUpdate(update) {
    const { value, updateCount } = update;
    observer(value);
    E(notifier).getUpdateSince(updateCount).then(handleUpdate);
  }
  E(notifier).getUpdateSince().then(handleUpdate);
}

const handlers = { onOpen };

function onOpen(event) {
  const { abort, dispatch, getBootstrap } = makeCapTP('simple-wallet', sendMessage);
  handlers.onMessage = (event) => {
    const obj = JSON.parse(event.data);
    dispatch(obj);
  };
  handlers.onClose = (event) => {
    // Throw away our state.
    resetClientState();
    abort();
  };

  // Wait for the other side to finish loading.
  E.G(getBootstrap()).LOADING.then(_ => 
    // Begin the flow of messages to our wallet, which
    // we refetch from the new, loaded, bootstrap object.
    E.G(getBootstrap()).wallet
  ).then(walletPresence => walletPK.resolve(walletPresence));
}

// This is the public state, a promise that never resolves,
// but pipelines messages to the walletPK.promise.
const walletP = new HandledPromise(() => {}, {
  applyMethod(_p, name, args) {
    return E(walletPK.promise)[name](...args);
  },
  get(_p, name) {
    return E(walletPK.promise)[name];
  },
});

resetClientState();
const { connected, sendMessage } = makeWebSocket('/private/captp', handlers)

export {
  inbox,
  purses,
  connected,
  walletP,
}
