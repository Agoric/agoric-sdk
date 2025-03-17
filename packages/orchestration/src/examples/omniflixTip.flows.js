import { M, mustMatch } from '@endo/patterns';
import { makeTracer } from '@agoric/internal';
import { NonNullish } from '@agoric/internal';
import { orcUtils } from '@agoric/orchestration/src/utils/orc.js';
import { makeLocalAccount } from './shared.flows';

const trace = makeTracer('OmniflixTipFlows');

/**
 * Swaps an input token to FLIX on Osmosis and tips a recipient on Omniflix.
 * @param {import('@agoric/orchestration').Orchestrator} orch
 * @param {Object} ctx
 * @param {ZCFSeat} seat
 * @param {Object} offerArgs
 * @param {string} offerArgs.chainId - Source chain ID
 * @param {string} offerArgs.tokenDenom - Source token denomination
 * @param {string} offerArgs.recipientAddress - Omniflix recipient address
 * @param {number} offerArgs.slippage - Slippage tolerance
 */
export const tipOnOmniflix = async (
  orch,
  { localAccountP, localTransfer, withdrawToSeat },
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

  const osmosisAccount = await osmosis.makeAccount();


  const osmosisAddress = osmosisAccount.getAddress();

  // Transfer input token from user to local Agoric account
  const assets = await agoric.getVBankAssetInfo();
  trace(`got info for denoms: ${assets.map(a => a.denom).join(', ')}`);
  
  const { denom } = NonNullish(
    assets.find(a => a.brand === amount.brand),
    `${amount.brand} not registered in vbank`,
  );
  
  // const localAccount = await localAccountP;
  const localAccount = await agoric.makeAccount();
  await localTransfer(seat, localAccount, give);
  
  // Swap input token to uflix on Osmosis and send to recipient
  
  try {
    trace('Executing swap and transfer...');
    await localAccount.transfer(
      {
        value: recipientAddress,
        encoding: 'bech32',
        chainId: 'flix-chain-0',
      },
      { denom, value: amount.value },
    );
    
    seat.exit();
  } catch (e) {
    trace('Error during swap/transfer:', e);
    await withdrawToSeat(localAccount, seat, give);
    throw new Error(`Tipping failed: ${e.message}`);
  }
};
harden(tipOnOmniflix);