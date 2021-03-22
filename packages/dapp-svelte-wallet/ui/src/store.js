// @ts-check
import { writable } from 'svelte/store';
import { E } from '@agoric/eventual-send';
import { observeNotifier } from '@agoric/notifier';

import { makeWebSocket } from './websocket';
import { makeCapTPConnection } from './captp';

import '../../api/src/internal-types';
import '../../api/src/types';

let accessTokenParams;
let hasAccessToken;

const resetAlls = [];

/**
 * Like React useHook, return a store and a setter for it
 *
 * @template T
 * @param {T} value
 * @param {T} [reset=value]
 * @returns {[any, (value: T) => void]}
 */
function makeReadable(value, reset = value) {
  const store = writable(value);
  resetAlls.push(() => store.set(reset));
  return [{ subscribe: store.subscribe }, store.set];
}

function getAccessToken() {
  // Fetch the access token from the window's URL.
  accessTokenParams = `?${window.location.hash.slice(1)}`;
  hasAccessToken = new URLSearchParams(accessTokenParams).get('accessToken');

  try {
    if (hasAccessToken) {
      // Store the access token for later use.
      localStorage.setItem('accessTokenParams', accessTokenParams);
    } else {
      // Try reviving it from localStorage.
      accessTokenParams = localStorage.getItem('accessTokenParams') || '?';
      hasAccessToken = new URLSearchParams(accessTokenParams).get(
        'accessToken',
      );
    }
  } catch (e) {
    console.log('Error fetching accessTokenParams', e);
  }

  // Now that we've captured it, clear out the access token from the URL bar.
  window.location.hash = '';
  window.addEventListener('hashchange', _ev => {
    // See if we should update the access token params.
    const atp = `?${window.location.hash.slice(1)}`;
    const hat = new URLSearchParams(atp).get('accessToken');

    if (hat) {
      // We have new params, so replace them.
      accessTokenParams = atp;
      hasAccessToken = hat;
      localStorage.setItem('accessTokenParams', accessTokenParams);
    }

    // Keep it clear.
    window.location.hash = '';
  });
}
getAccessToken();

if (!hasAccessToken) {
  // This is friendly advice to the user who doesn't know.
  if (
    // eslint-disable-next-line no-alert
    window.confirm(
      `\
You must open the Agoric wallet with the
      agoric open
command line executable.

See the documentation?`,
    )
  ) {
    window.location.href =
      'https://agoric.com/documentation/getting-started/agoric-cli-guide.html#agoric-open';
  }
}

// Create a connection so that we can derive presences from it.
const { connected, makeStableForwarder } = makeCapTPConnection(
  handler => makeWebSocket(`/private/captp${accessTokenParams}`, handler),
  // eslint-disable-next-line no-use-before-define
  { onReset },
);

export { connected };

// Get some properties of the bootstrap object as stable identites.
/** @type {WalletAdminFacet} */
export const walletP = makeStableForwarder(bootP =>
  E(E.get(bootP).wallet).getAdminFacet(),
);
export const boardP = makeStableForwarder(bootP => E.get(bootP).board);

// We initialize as false, but reset to true on disconnects.
const [ready, setReady] = makeReadable(false, true);
const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);
const [dapps, setDapps] = makeReadable([]);
const [payments, setPayments] = makeReadable([]);
const [contacts, setContacts] = makeReadable([]);
const [selfContact, setSelfContact] = makeReadable(undefined);
const [issuers, setIssuers] = makeReadable([]);

export {
  ready,
  inbox,
  purses,
  dapps,
  payments,
  issuers,
  contacts,
  selfContact,
};

function cmp(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function kv(keyObj, val) {
  const key = Object.values(keyObj)[0];
  const text = Array.isArray(key) ? key.join('.') : key;
  return { ...val, ...keyObj, id: text, text, value: val };
}

function onReset(readyP) {
  // Reset is beginning, set unready.
  setReady(false);

  // When the ready promise fires, reset to ready.
  readyP.then(() => resetAlls.forEach(fn => fn()));
  E(walletP)
    .getSelfContact()
    .then(sc => setSelfContact({ contactPetname: 'Self', ...kv('Self', sc) }));
  // Set up our subscriptions.
  observeNotifier(E(walletP).getOffersNotifier(), {
    updateState(state) {
      setInbox(
        state
          .map(tx => ({
            ...tx,
            offerId: tx.id,
            id: `${tx.requestContext.date}-${tx.requestContext.dappOrigin}-${tx.id}`,
          }))
          .sort((a, b) => cmp(b.id, a.id)),
      );
    },
  });
  observeNotifier(E(walletP).getPursesNotifier(), {
    updateState(state) {
      setPurses(
        state
          .map(purse => kv({ pursePetname: purse.pursePetname }, purse))
          .sort(
            (a, b) =>
              cmp(a.brandPetname, b.brandPetname) ||
              cmp(a.pursePetname, b.pursePetname),
          ),
      );
    },
  });
  observeNotifier(E(walletP).getDappsNotifier(), {
    updateState(state) {
      setDapps(
        state
          .map(dapp => ({ ...dapp, id: dapp.origin }))
          .sort((a, b) => cmp(a.petname, b.petname) || cmp(a.id, b.id)),
      );
    },
  });
  observeNotifier(E(walletP).getContactsNotifier(), {
    updateState(state) {
      setContacts(
        state
          .map(([contactPetname, contact]) => kv({ contactPetname }, contact))
          .sort(
            (a, b) =>
              cmp(a.contactPetname, b.contactPetname) || cmp(a.id, b.id),
          ),
      );
    },
  });
  observeNotifier(E(walletP).getPaymentsNotifier(), {
    updateState: setPayments,
  });
  observeNotifier(E(walletP).getIssuersNotifier(), {
    updateState(state) {
      setIssuers(
        state
          .map(([issuerPetname, issuer]) => kv({ issuerPetname }, issuer))
          .sort((a, b) => cmp(a.id, b.id)),
      );
    },
  });
}
