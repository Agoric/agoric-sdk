import { NonNullish } from '@agoric/internal';
import { Fail, makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Invitation, ZCF, ZCFSeat} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ERTP';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods} from '../types.js';
 * @import {AccountIdArg} from '../orchestration-api.ts';
 */

const { entries } = Object;

// in guest file (the orchestration functions)
// the second argument is all the endowments provided

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 */
export const makeNobleAccount = async orch => {
  const nobleChain = await orch.getChain('noble');
  return nobleChain.makeAccount();
};
harden(makeNobleAccount);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {Promise<
 *   GuestInterface<
 *     import('../exos/cosmos-orchestration-account.js').CosmosOrchestrationAccountKit['holder']
 *   >
 * >} ctx.nobleAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {Brand} ctx.USDC
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; destAddr: string }} offerArgs
 */
export const sendIt = async (
  orch,
  {
    sharedLocalAccountP,
    nobleAccountP,
    USDC,
    log,
    zoeTools: { localTransfer, withdrawToSeat },
  },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  void log(`sending {${amt.value}} from ${chainName} to ${destAddr}`);
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  void log(`got info for denoms: ${assets.map(a => a.denom).join(', ')}`);
  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );

  const chain = await orch.getChain(chainName);
  const info = await chain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');
  void log(`got info for chain: ${chainName} ${chainId}`);

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;
  await localTransfer(seat, sharedLocalAccount, give);

  if (typeof info.cctpDestinationDomain !== 'number') {
    // within the inter-chain; no CCTP needed
    void log(`completed transfer to localAccount`);

    try {
      await sharedLocalAccount.transfer(
        {
          value: destAddr,
          encoding: 'bech32',
          chainId,
        },
        { denom, value: amt.value },
      );
      void log(`completed transfer to ${destAddr}`);
    } catch (e) {
      await withdrawToSeat(sharedLocalAccount, seat, give);
      const errorMsg = `IBC Transfer failed ${q(e)}`;
      void log(`ERROR: ${errorMsg}`);
      seat.fail(errorMsg);
      throw makeError(errorMsg);
    }
  } else {
    amt.brand === USDC || Fail`Only USDC is transferable to ${chainId}`;

    const nobleAccount = await nobleAccountP;
    const nobleAddr = await nobleAccount.getAddress();
    const denomAmt = { denom, value: amt.value };
    await sharedLocalAccount.transfer(nobleAddr, denomAmt);
    void log('assets are now on noble');

    const encoding = 'ethereum'; // XXX TODO. could be solana?
    /** @type {AccountIdArg} */
    const mintRecipient = { chainId, encoding, value: destAddr };
    await nobleAccount.depositForBurn(mintRecipient, denomAmt);
  }
  seat.exit();
  void log(`transfer complete, seat exited`);
};
harden(sendIt);
