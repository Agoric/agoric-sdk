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

function cmp(a, b) {
  return a < b ? -1 : a === b ? 0 : 1;
}

function comparable(x) {
  return JSON.stringify(x);
}

function onReset(readyP) {
  readyP.then(() => resetAlls.forEach(fn => fn()));
  E(walletP).getSelfContact().then(setSelfContact);
  // Set up our subscriptions.
  updateFromNotifier({
    updateState(ijs) {
      const state = JSON.parse(ijs);
      setInbox(state.map(tx => ({ ...tx, offerId: tx.id, id: `${tx.requestContext.date}-${tx.requestContext.dappOrigin}`}))
        .sort((a, b) => cmp(b.id, a.id)));
    },
  }, E(walletP).getInboxJSONNotifier());
  updateFromNotifier({
    updateState(state) {
      setPurses(state.map(purse => ({ ...purse, id: comparable(purse.pursePetname) }))
        .sort((a, b) => cmp(a.brandPetname, b.brandPetname) || cmp(a.pursePetname, b.pursePetname)));
    },
  }, E(walletP).getPursesNotifier());
  updateFromNotifier({
    updateState(state) {
      setDapps(state.map(dapp => ({ ...dapp, id: dapp.origin }))
        .sort((a, b) => cmp(a.dappPetname, b.dappPetname) || cmp(a.id, b.id)));
    },
  }, E(walletP).getDappsNotifier());
  updateFromNotifier({ updateState: setContacts }, E(walletP).getContactsNotifier());
  updateFromNotifier({ updateState: setPayments }, E(walletP).getPaymentsNotifier());
  updateFromNotifier({
    updateState(state) {
      setIssuers(state.map(([issuerPetname, issuer]) => ({ ...issuer, issuerPetname, id: comparable(issuerPetname), text: issuerPetname }))
        .sort((a, b) => cmp(a.id, b.id)));
    },
  }, E(walletP).getIssuersNotifier());
}

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  resetAlls.push(() => store.set(start));
  return [{ subscribe: store.subscribe }, store.set];
}
