import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods} from '../types.js';
 */

const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

const channels = {
  AGORIC_XNET_TO_OSMOSIS: 'channel-6',
  AGORIC_DEVNET_TO_OSMOSIS: 'channel-61',
  OSMOSIS_TO_AXELAR: 'channel-4118',
};

const { entries } = Object;

// in guest file (the orchestration functions)
// the second argument is all the endowments provided

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{
 *   chainName: string;
 *   destAddr: string;
 *   type: number;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 * }} offerArgs
 */
export const sendIt = async (
  orch,
  { sharedLocalAccountP, log, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  mustMatch(
    offerArgs,
    harden({
      chainName: M.scalar(),
      destAddr: M.string(),
      type: M.number(),
      destinationEVMChain: M.string(),
      gasAmount: M.number(),
    }),
  );
  const { chainName, destAddr, type, destinationEVMChain, gasAmount } =
    offerArgs;
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

  void log(`completed transfer to localAccount`);

  const memoToAxelar = {
    destination_chain: destinationEVMChain,
    destination_address: destAddr,
    payload: null,
    type,
  };

  if (type === 1 || type === 2) {
    memoToAxelar.fee = {
      amount: gasAmount,
      recipient: addresses.AXELAR_GAS,
    };
  }

  const memo = {
    forward: {
      receiver: addresses.AXELAR_GMP,
      port: 'transfer',
      channel: channels.OSMOSIS_TO_AXELAR,
      timeout: '10m',
      retries: 2,
      next: JSON.stringify(memoToAxelar),
    },
  };

  try {
    await sharedLocalAccount.transfer(
      {
        value: destAddr,
        encoding: 'bech32',
        chainId,
      },
      { denom, value: amt.value },
      { memo: JSON.stringify(memo) },
    );
    void log(`completed transfer to ${destAddr}`);
  } catch (e) {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    void log(`ERROR: ${errorMsg}`);
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
  void log(`transfer complete, seat exited`);
};
harden(sendIt);
