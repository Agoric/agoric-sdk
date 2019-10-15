export function activateConnection(state) {
  return { ...state, active: true };
}
export function deactivateConnection(state) {
  return { ...state, active: false };
}

export function serverConnected(state) {
  return { ...state, connected: true };
}
export function serverDisconnected(state) {
  return { ...state, connected: false };
}

export function updatePurses(state, purses) {
  return { ...state, purses };
}

export function updateTransactions(state, transactions) {
  console.log('*** payload', transactions);
  return { ...state, transactions };
}

export function confirmTrade(state) {
  return { ...state };
}

export function rejectTrade(state) {
  return { ...state };
}
