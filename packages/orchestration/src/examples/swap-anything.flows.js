import { NonNullish, makeTracer } from '@agoric/internal';
import { Fail, makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';
import { RatioShape } from '@agoric/ertp';

const trace = makeTracer('SwapAnything');

const { entries } = Object;

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Denom, DenomDetail} from '@agoric/orchestration';
 * @import {ZCF, ZCFSeat} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ertp';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, ChainHub, ChainInfo} from '../types.js';
 * @import {AccountIdArg} from '../orchestration-api.ts';
 */

const denomForBrand = async (orch, brand) => {
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find(a => a.brand === brand),
    `${brand} not registered in ChainHub`,
  );
  return denom;
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<ChainHub>} ctx.chainHub
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{
 *   destAddr: string;
 *   receiverAddr: string;
 *   outDenom: Denom;
 *   slippage: { slippageRatio: Ratio; windowSeconds: bigint };
 *   onFailedDelivery: string;
 *   nextMemo?: string;
 * }} offerArgs
 */

// Given USDC, swap to desired token with slippage
// Ref: https://github.com/osmosis-labs/osmosis/tree/main/cosmwasm/contracts/crosschain-swaps#via-ibc
export const swapIt = async (
  orch,
  {
    chainHub,
    sharedLocalAccountP,
    log,
    zoeTools: { localTransfer, withdrawToSeat },
  },
  seat,
  offerArgs,
) => {
  //   offerArgs,
  //   harden({
  //     destAddr: M.string(),
  //     receiverAddr: M.string(),
  //     outDenom: M.string(),
  //     onFailedDelivery: M.string(),
  //     slippage: { slippageRatio: RatioShape, windowSeconds: M.bigint() },
  //   }),
  // );
  mustMatch(
    offerArgs,
    M.splitRecord(
      {
        destAddr: M.string(),
        receiverAddr: M.string(),
        outDenom: M.string(),
        onFailedDelivery: M.string(),
        slippage: { slippageRatio: RatioShape, windowSeconds: M.bigint() },
      },
      { nextMemo: M.or(undefined, M.string()) },
    ),
  );

  trace('HELLLOOOOO');

  const { destAddr } = offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  void log(`sending {${amt.value}} from osmosis to ${destAddr}`);
  const denom = await denomForBrand(orch, amt.brand);

  /** @type {ChainInfo} */
  const info = await chainHub.getChainInfo('osmosis');

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  /**
   * Helper function to recover if IBC Transfer fails
   *
   * @param {Error} e
   */
  const recoverFailedTransfer = async e => {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    void log(`ERROR: ${errorMsg}`);
    seat.fail(errorMsg);
    throw makeError(errorMsg);
  };

  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  const [_a, _o, connection] = await chainHub.getChainsAndConnection(
    'agoric',
    'osmosis',
  );

  connection.counterparty || Fail`No IBC connection to Osmosis`;

  void log(`got info for chain: osmosis ${chainId}`);

  await localTransfer(seat, sharedLocalAccount, give);
  void log(`completed transfer to localAccount`);

  try {
    await sharedLocalAccount.transfer(
      { value: destAddr, encoding: 'bech32', chainId },
      { denom, value: amt.value },
      // memo here
    );
    void log(`completed transfer to ${destAddr}`);
  } catch (e) {
    return recoverFailedTransfer(e);
  }

  seat.exit();
  void log(`transfer complete, seat exited`);
};
harden(swapIt);
