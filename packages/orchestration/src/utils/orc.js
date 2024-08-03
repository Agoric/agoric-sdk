/** @import {AfterAction, SwapExact, SwapMaxSlippage, TransferMsg} from '../types.js' */

export const orcUtils = {
  /**
   * unwinds denom with PFM, if necessary
   *
   * @param {Omit<TransferMsg, 'memo'>} _args
   * @returns {TransferMsg}
   */
  makeTransferMsg: _args => {
    // FIXME mocked, so typescript is happy
    return {
      toAccount: {
        chainId: 'osmosis-test',
        value: 'osmo1234',
        encoding: 'bech32',
      },
    };
  },
  /**
   * SwapExact or SwapMaxSlippage, with optional AfterAction
   *
   * @param {(SwapExact | SwapMaxSlippage) &
   *   (AfterAction | Record<string, never>)} _args
   *
   * @returns {TransferMsg}
   */
  makeOsmosisSwap(_args) {
    // FIXME mocked, so typescript is happy
    return {
      toAccount: {
        chainId: 'osmosis-test',
        value: 'osmo1234',
        encoding: 'bech32',
      },
    };
  },
};
