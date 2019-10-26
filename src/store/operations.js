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
export function updateExchangeAmount(state, exchangeAmount) {
  return { ...state, exchangeAmount };
}

export function changePurse(state, { purse, isInputPurse }) {
  let { inputPurse, outputPurse } = state;
  if (isInputPurse) {
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
export function changeAmount(state, { amount, isInputAmount }) {
  return isInputAmount
    ? { ...state, inputAmount: amount, isInputAmount }
    : { ...state, outputAmount: amount, isInputAmount };
}
export function swapInputs(state) {
  const {
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    isInputAmount,
  } = state;
  return {
    ...state,
    inputPurse: outputPurse,
    outputPurse: inputPurse,
    inputAmount: outputAmount,
    outputAmount: inputAmount,
    isInputAmount: !isInputAmount, // swap dependent and free variable
  };
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
