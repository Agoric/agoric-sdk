/** @import {AfterAction, Denom, SwapExact, SwapMaxSlippage, TransferMsg} from '../types.js' */

/**
 * @template M
 * @typedef {{
 *   wasm: {
 *     contract: WASMContractAddress;
 *     msg: M;
 *   };
 * }} IBCHook
 */
/**
 * @typedef {string} WASMContractAddress
 *
 * @typedef {string} Percentage
 */
/**
 * @template M
 * @typedef {{
 *   osmosis_swap: {
 *     output_denom: Denom;
 *     slippage: {
 *       twap: { slippage_percentage: Percentage; window_seconds: number };
 *     };
 *     receiver: string;
 *     on_failed_delivery: 'do_nothing';
 *     next_memo: M;
 *   };
 * }} XCSv2Msg
 */
/**
 * cf.
 * https://github.com/osmosis-labs/osmosis/tree/main/cosmwasm/contracts/crosschain-swaps#via-ibc
 *
 * @satisfies {IBCHook<XCSv2Msg<null>>}
 */
const XCSv2example = {
  wasm: {
    contract: 'osmo1crosschainswapscontract',
    msg: {
      osmosis_swap: {
        output_denom: 'token1',
        slippage: { twap: { slippage_percentage: '20', window_seconds: 10 } },
        receiver: 'juno1receiver',
        on_failed_delivery: 'do_nothing',
        next_memo: null,
      },
    },
  },
};

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
   *   (AfterAction | Record<string, never>)} opts
   *
   * @returns {TransferMsg}
   */
  makeOsmosisSwap(opts) {
    assert('slippage' in opts, 'SwapExact is TODO');
    assert('destAddress' in opts, 'TODO: optional destAddress');
    /** @type {XCSv2Msg<null>} */
    const it = {
      osmosis_swap: {
        output_denom: '// @@@TODO',
        slippage: {
          twap: {
            slippage_percentage: `${opts.slippage * 100}`,
            window_seconds: 10,
          },
        },
        receiver: opts.destAddress.value,
        on_failed_delivery: 'do_nothing',
        next_memo: null,
      },
    };
    return it;
  },
};
