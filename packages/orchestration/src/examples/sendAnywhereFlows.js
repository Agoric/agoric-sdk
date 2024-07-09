import { M, mustMatch } from '@endo/patterns';

/**
 * @import {Orchestrator, OrchestrationAccount} from '../types.js';
 */

const { entries } = Object;

// in guest file (the orchestration functions)
// the second argument is all the endowments provided

export const orchestrationFns = harden({
  /**
   * @param {Orchestrator} orch
   * @param {object} ctx
   * @param {{ account: OrchestrationAccount<any> }} ctx.contractState
   * @param {any} ctx.localTransfer
   * @param {any} ctx.findBrandInVBank
   * @param {ZCFSeat} seat
   * @param {{ chainName: string; destAddr: string }} offerArgs
   */
  async sendIt(
    orch,
    { contractState, localTransfer, findBrandInVBank },
    seat,
    offerArgs,
  ) {
    mustMatch(
      offerArgs,
      harden({ chainName: M.scalar(), destAddr: M.string() }),
    );
    const { chainName, destAddr } = offerArgs;
    // NOTE the proposal shape ensures that the `give` is a single asset
    const { give } = seat.getProposal();
    const [[_kw, amt]] = entries(give);
    const { denom } = await findBrandInVBank(amt.brand);
    const chain = await orch.getChain(chainName);

    if (!contractState.account) {
      const agoricChain = await orch.getChain('agoric');
      contractState.account = await agoricChain.makeAccount();
    }

    const info = await chain.getChainInfo();
    const { chainId } = info;
    assert(typeof chainId === 'string', 'bad chainId');

    await localTransfer(seat, contractState.account, give);

    await contractState.account.transfer(
      { denom, value: amt.value },
      {
        value: destAddr,
        encoding: 'bech32',
        chainId,
      },
    );
  },
});
