import { writable } from 'svelte/store';
import { E } from '@agoric/eventual-send';
import { updateFromNotifier } from '@agoric/notifier';

import { makeWebSocket } from './websocket';
import { makeCapTPConnection } from './captp';

// Create a connection so that we can derive presences from it.
const { connected, makeStableForwarder } = makeCapTPConnection(
  handler => makeWebSocket('/private/captp', handler),
  { onReset },
);

export { connected };

// Get some properties of the bootstrap object as stable identites.
export const walletP = makeStableForwarder(bootP => E.G(bootP).wallet);
export const boardP = makeStableForwarder(bootP => E.G(bootP).board);

const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);
const [dapps, setDapps] = makeReadable([]);
const [payments, setPayments] = makeReadable([]);
const [issuers, setIssuers] = makeReadable([]);

export { inbox, purses, dapps, payments, issuers };

function onReset(_bootP) {
  // Set up our subscriptions.
  const subs = [
    [E(walletP).getPursesNotifier(), pjs => setPurses(JSON.parse(pjs))],
    [E(walletP).getInboxNotifier(), ijs => setInbox(JSON.parse(ijs))],
    [E(walletP).getDappRecordNotifier(), setDapps],
  ];
  subs.map(([notifier, updateState]) =>
    updateFromNotifier({ updateState }, notifier));
}

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  return [{ subscribe: store.subscribe }, store.set];
}
