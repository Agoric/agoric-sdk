import { M, mustMatch } from '@endo/patterns';
import { makeTracer } from '@agoric/internal';
import { orcUtils } from '@agoric/orchestration/src/utils/orc.js';

const trace = makeTracer('OmniflixTipFlows');

/**
 * Swaps an input token to FLIX on Osmosis and tips a recipient on Omniflix.
 * @param {import('@agoric/orchestration').Orchestrator} orch
 * @param {Object} ctx
 * @param {import('../utils/zoe-tools.js').LocalTransfer} ctx.localTransfer
 * @param {ZCFSeat} seat
 * @param {Object} offerArgs
 * @param {string} offerArgs.chainId - Source chain ID
 * @param {string} offerArgs.tokenDenom - Source token denomination
 * @param {string} offerArgs.recipientAddress - Omniflix recipient address
 * @param {number} offerArgs.slippage - Slippage tolerance
 */
export const tipOnOmniflix = async (
  orch,
  { localTransfer },
  seat,
  { chainId, tokenDenom, recipientAddress, slippage },
) => {
  trace('Starting tipOnOmniflix', { chainId, tokenDenom, recipientAddress });

  mustMatch( harden({ chainId, tokenDenom, recipientAddress, slippage }), harden({
    chainId: M.string(),
    tokenDenom: M.string(),
    recipientAddress: M.string(),
    slippage: M.number(),
  }));

  const { give } = seat.getProposal();
  const [[_kw, amount]] = Object.entries(give);
  
  // Create accounts on Agoric and Osmosis
  const [agoric, osmosis] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain('osmosis'),
  ]);

  const localAccount = await agoric.makeAccount();
  const osmosisAccount = await osmosis.makeAccount();


  const osmosisAddress = osmosisAccount.getAddress();

  const blnc3 = await localAccount.getBalances();
  // Transfer input token from user to local Agoric account
  const result = await localTransfer(seat, localAccount, give);
  debugger
  const blnc4=await localAccount.getBalances();
  debugger
  // Swap input token to uflix on Osmosis and send to recipient
  const transferMsg = orcUtils.makeOsmosisSwap({
    destChain: 'omniflixhub',
    destAddress: recipientAddress,
    amountIn: amount,
    brandOut: 'uflix',
    slippage: slippage || 0.03, // Default 3%
    inputDenom: tokenDenom,
    inputChainId: chainId,
  });
  // const blnc = await localAccount.getBalances();
  // const blnc2 = await osmosisAccount.getBalances();
  debugger
  try {
    trace('Executing swap and transfer...');
    await   localAccount.transferSteps(amount, transferMsg);
    debugger;
    seat.exit();
  } catch (e) {
    trace('Error during swap/transfer:', e);
    await localTransfer(seat, localAccount, give); // Refund on failure
    throw new Error(`Tipping failed: ${e.message}`);
  }
};
harden(tipOnOmniflix);