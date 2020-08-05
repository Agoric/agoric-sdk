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

const resetAlls = [];
const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);
const [dapps, setDapps] = makeReadable([]);
const [payments, setPayments] = makeReadable([]);
const [contacts, setContacts] = makeReadable([]);
const [selfContact, setSelfContact] = makeReadable();
const [issuers, setIssuers] = makeReadable([]);

export { inbox, purses, dapps, payments, issuers, contacts, selfContact };

function onReset(readyP) {
  readyP.then(() => resetAlls.forEach(fn => fn()));
  E(walletP).getSelfContact().then(setSelfContact);
  // Set up our subscriptions.
  updateFromNotifier({
    updateState(ijs) {
      setInbox(JSON.parse(ijs));
    },
   }, E(walletP).getInboxJSONNotifier(),
  );
  updateFromNotifier({ updateState: setPurses}, E(walletP).getPursesNotifier());
  updateFromNotifier({ updateState: setDapps}, E(walletP).getDappsNotifier());
  updateFromNotifier({ updateState: setContacts }, E(walletP).getContactsNotifier());
  updateFromNotifier({ updateState: setPayments }, E(walletP).getPaymentsNotifier());
  updateFromNotifier({ updateState: setIssuers }, E(walletP).getIssuersNotifier());
}

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  resetAlls.push(() => store.set(start));
  return [{ subscribe: store.subscribe }, store.set];
}
