import { writable } from 'svelte/store';
import { E } from '@agoric/eventual-send';
import { updateFromNotifier } from '@agoric/notifier';

import { makeWebSocket } from './websocket';
import { makeCapTPConnection } from './captp';

// Fetch the access token from the window's URL.
const accessTokenParams = `?${window.location.hash.slice(1)}`;
// Now that we've captured it, clear out the access token from the URL bar.
window.location.hash = '';
window.addEventListener('hashchange', _ev => {
  // Keep it clear.
  window.location.hash = '';
});
const hasAccessToken = new URLSearchParams(accessTokenParams).has(
  'accessToken',
);

if (!hasAccessToken) {
  // This is friendly advice to the user who doesn't know.
  if (confirm(
    `\
You must open the Agoric wallet with the
      agoric open
command line executable.

See the documentation?`,
  )) {
    window.location.href =
      'https://agoric.com/documentation/getting-started/agoric-cli-guide.html#agoric-open';
  }
}

// Create a connection so that we can derive presences from it.
const { connected, makeStableForwarder } = makeCapTPConnection(
  handler => makeWebSocket(`/private/captp${accessTokenParams}`, handler),
  { onReset },
);

export { connected };

// Get some properties of the bootstrap object as stable identites.
export const walletP = makeStableForwarder(bootP => E.G(bootP).wallet);
export const boardP = makeStableForwarder(bootP => E.G(bootP).board);

const resetAlls = [];

// We initialize as false, but reset to true on disconnects.
const [ready, setReady] = makeReadable(false, true);
const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);
const [dapps, setDapps] = makeReadable([]);
const [payments, setPayments] = makeReadable([]);
const [contacts, setContacts] = makeReadable([]);
const [selfContact, setSelfContact] = makeReadable();
const [issuers, setIssuers] = makeReadable([]);

export { ready, inbox, purses, dapps, payments, issuers, contacts, selfContact };

function cmp(a, b) {
  return a < b ? -1 : a === b ? 0 : 1;
}

function kv(keyObj, val) {
  const key = Object.values(keyObj)[0];
  const text = Array.isArray(key) ? key.join('.') : key;
  return { ...val, ...keyObj, id: text, text, value: val };;
}

function onReset(readyP) {
  // Reset is beginning, set unready.
  setReady(false);

  // When the ready promise fires, reset to ready.
  readyP.then(() => resetAlls.forEach(fn => fn()));
  E(walletP).getSelfContact().then(sc => setSelfContact({ contactPetname: 'Self', ...kv('Self', sc) }));
  // Set up our subscriptions.
  updateFromNotifier({
    updateState(ijs) {
      const state = JSON.parse(ijs);
      setInbox(state.map(tx => ({ ...tx, offerId: tx.id, id: `${tx.requestContext.date}-${tx.requestContext.dappOrigin}-${tx.id}`}))
        .sort((a, b) => cmp(b.id, a.id)));
    },
  }, E(walletP).getInboxJSONNotifier());
  updateFromNotifier({
    updateState(state) {
      setPurses(state.map(purse => kv({ pursePetname: purse.pursePetname }, purse))
        .sort((a, b) => cmp(a.brandPetname, b.brandPetname) || cmp(a.pursePetname, b.pursePetname)));
    },
  }, E(walletP).getPursesNotifier());
  updateFromNotifier({
    updateState(state) {
      setDapps(state.map(dapp => ({ ...dapp, id: dapp.origin }))
        .sort((a, b) => cmp(a.dappPetname, b.dappPetname) || cmp(a.id, b.id)));
    },
  }, E(walletP).getDappsNotifier());
  updateFromNotifier({
    updateState(state) {
      setContacts(state.map(([contactPetname, contact]) => kv({ contactPetname }, contact))
        .sort((a, b) => cmp(a.contactPetname, b.contactPetname) || cmp(a.id, b.id)));
    },
  }, E(walletP).getContactsNotifier());
  updateFromNotifier({ updateState: setPayments }, E(walletP).getPaymentsNotifier());
  updateFromNotifier({
    updateState(state) {
      setIssuers(state.map(([issuerPetname, issuer]) => kv({ issuerPetname }, issuer))
        .sort((a, b) => cmp(a.id, b.id)));
    },
  }, E(walletP).getIssuersNotifier());
}

// like React useHook, return a store and a setter for it
function makeReadable(value, reset = value) {
  const store = writable(value);
  resetAlls.push(() => store.set(reset));
  return [{ subscribe: store.subscribe }, store.set];
}
