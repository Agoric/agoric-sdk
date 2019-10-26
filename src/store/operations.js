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

export function changePurse(state, { purse, isInput }) {
  let { inputPurse, outputPurse } = state;
  if (isInput) {
    inputPurse = purse;
    if (inputPurse === outputPurse) {
      outputPurse = undefined;
    }
  } else {
    outputPurse = purse;
    if (outputPurse === inputPurse) {
      inputPurse = undefined;
    }
  }
  return { ...state, inputPurse, outputPurse };
}

export function swapPurses(state) {
  const { inputPurse, outputPurse } = state;
  return { ...state, inputPurse: outputPurse, outputPurse: inputPurse };
}

export function changeAmount(state, { amount, isInput }) {
  return isInput
    ? { ...state, inputAmount: amount }
    : { ...state, outputAmount: amount };
}

export function createOffer(state) {
  return { ...state };
}

export function resetState(state) {
  return {
    ...state,
    inputAmount: '',
    outputAmount: '',
    inputPurse: '',
    outputPurse: '',
  };
}
