import { doFetch } from '../utils/fetch-websocket';

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

export function changePurse(
  state,
  { purse, fieldNumber, freeVariable = null },
) {
  let { inputPurse, outputPurse } = state;
  if (fieldNumber === 0) {
    inputPurse = purse;
    if (inputPurse === outputPurse) {
      outputPurse = null;
    }
  }
  if (fieldNumber === 1) {
    outputPurse = purse;
    if (outputPurse === inputPurse) {
      inputPurse = null;
    }
  }
  return { ...state, inputPurse, outputPurse, freeVariable };
}
export function changeAmount(
  state,
  { amount, fieldNumber, freeVariable = null },
) {
  let { inputAmount, outputAmount } = state;
  if (fieldNumber === 0) {
    inputAmount = amount;
  }
  if (fieldNumber === 1) {
    outputAmount = amount;
  }
  return { ...state, inputAmount, outputAmount, freeVariable };
}
export function swapInputs(state) {
  const { inputPurse, outputPurse, inputAmount, outputAmount } = state;
  return {
    ...state,
    inputPurse: outputPurse,
    outputPurse: inputPurse,
    inputAmount: outputAmount,
    outputAmount: inputAmount,
  };
}

export function createOffer(
  state,
  { instanceId, inputAmount, outputAmount, inputPurse, outputPurse },
) {
  const meta = {
    instanceId,
    date: Date.now(),
    extent0: inputAmount,
    extent1: outputAmount,
    purseName0: inputPurse.purseName,
    purseName1: outputPurse.purseName,
    assayId0: inputPurse.assayId,
    assayId1: outputPurse.assayId,
  };
  doFetch({
    type: 'autoswapGetOfferRules',
    data: meta,
  }).then(response => {
    const { type, data } = response;
    if (type === 'autoswapOfferRules') {
      return doFetch({
        type: 'walletAddOffer',
        data: {
          meta,
          offerRules: data,
        },
      }, true);
    }
    return null;
  });

  return {
    ...state,
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
  };
}

export function resetState(state) {
  return {
    ...state,
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
  };
}
