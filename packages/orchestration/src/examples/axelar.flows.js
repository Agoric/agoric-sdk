/**
 * @file axelar.flows.js Offer handlers for axelar-gmp.contract.js
 */

import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { buildGMPPayload, GMPMessageType } from '../utils/gmp.js';
import {
  aaveContractFns,
  counterContractFns,
  ContractAddresses,
} from '../utils/contract-abis.js';

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
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

const channels = {
  AGORIC_XNET_TO_OSMOSIS: 'channel-6',
  AGORIC_DEVNET_TO_OSMOSIS: 'channel-61',
  OSMOSIS_TO_AXELAR: 'channel-4118',
};

/**
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{
 *   destAddr: string;
 *   type: number;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 *   payload?: number[];
 * }} offerArgs
 */
export const sendGMP = async (
  orch,
  { sharedLocalAccountP, log, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  const { destAddr, destinationEVMChain, gasAmount, type, payload } = offerArgs;
  const { give } = seat.getProposal();

  if (type !== GMPMessageType.MESSAGE_ONLY && !give) {
    throw makeError('Token transfer required for this message type');
  }

  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  let denom;

  if (give) {
    const [[_kw, amt]] = Object.entries(give);
    denom = NonNullish(
      assets.find(a => a.brand === amt.brand),
      `${amt.brand} not registered in vbank`,
    ).denom;
  }

  const osmosisChain = await orch.getChain('osmosis');
  const { chainId } = await osmosisChain.getChainInfo();

  const sharedLocalAccount = await sharedLocalAccountP;
  if (give) {
    await localTransfer(seat, sharedLocalAccount, give);
  }

  const memoToAxelar = {
    destination_chain: destinationEVMChain,
    destination_address: destAddr,
    payload,
    type,
  };

  if (type !== GMPMessageType.TOKEN_ONLY) {
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
    if (give) {
      const [[_kw, amt]] = Object.entries(give);
      await sharedLocalAccount.transfer(
        {
          value: addresses.OSMOSIS_RECEIVER,
          encoding: 'bech32',
          chainId,
        },
        { denom, value: amt.value },
        { memo: JSON.stringify(memo) },
      );
    } else {
      // For message-only calls, only send gas fee
      await sharedLocalAccount.transfer(
        {
          value: addresses.OSMOSIS_RECEIVER,
          encoding: 'bech32',
          chainId,
        },
        { denom: 'uosmo', value: gasAmount.toString() },
        { memo: JSON.stringify(memo) },
      );
    }
  } catch (e) {
    if (give) {
      await withdrawToSeat(sharedLocalAccount, seat, give);
    }
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    void log(`ERROR: ${errorMsg}`);
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
  void log('Transfer complete, seat exited');
};
harden(sendGMP);

/**
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{
 *   destAddr: string;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 *   params: {
 *     newCount: number;
 *   };
 * }} offerArgs
 */
export const setCount = async (
  orch,
  { sharedLocalAccountP, log, zoeTools },
  seat,
  offerArgs,
) => {
  const { destAddr, destinationEVMChain, gasAmount, params } = offerArgs;
  const { newCount } = params;

  const { functionSelector, encodedArgs } =
    counterContractFns.setCount(newCount);

  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const nonce = Math.floor(Math.random() * 1000000);

  const payload = buildGMPPayload({
    type: GMPMessageType.MESSAGE_ONLY,
    evmContractAddress: ContractAddresses.counter[destinationEVMChain],
    functionSelector,
    encodedArgs,
    deadline,
    nonce,
  });

  return sendGMP(orch, { sharedLocalAccountP, log, zoeTools }, seat, {
    destAddr,
    destinationEVMChain,
    gasAmount,
    type: GMPMessageType.MESSAGE_ONLY,
    payload,
  });
};
harden(setCount);

/**
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{
 *   destAddr: string;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 *   params: {
 *     onBehalfOf: string;
 *     referralCode?: number;
 *   };
 * }} offerArgs
 */
export const depositToAave = async (
  orch,
  { sharedLocalAccountP, log, zoeTools },
  seat,
  offerArgs,
) => {
  const { destAddr, destinationEVMChain, gasAmount, params } = offerArgs;
  const { onBehalfOf, referralCode } = params;

  const { functionSelector, encodedArgs } = aaveContractFns.depositETH(
    onBehalfOf,
    referralCode,
  );

  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const nonce = Math.floor(Math.random() * 1000000);

  const payload = buildGMPPayload({
    type: GMPMessageType.MESSAGE_WITH_TOKEN,
    evmContractAddress: ContractAddresses.aaveV3[destinationEVMChain],
    functionSelector,
    encodedArgs,
    deadline,
    nonce,
  });

  return sendGMP(orch, { sharedLocalAccountP, log, zoeTools }, seat, {
    destAddr,
    destinationEVMChain,
    gasAmount,
    type: GMPMessageType.MESSAGE_WITH_TOKEN,
    payload,
  });
};
harden(depositToAave);
