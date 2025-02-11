import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { ethers } from 'ethers';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods} from '../types.js';
 */

const { entries } = Object;

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
 * Generates a contract call payload for an EVM-based contract.
 *
 * @param {Object} params - The parameters for encoding the contract call.
 * @param {string} params.evmContractAddress - The address of the EVM contract
 *   to call.
 * @param {string} params.functionSelector - The function selector of the
 *   contract method.
 * @param {string} params.encodedArgs - The ABI-encoded arguments for the
 *   contract method.
 * @param {number} params.deadline
 * @param {number} params.nonce - A unique identifier for the transaction.
 * @returns {number[]} The encoded contract call payload as an array of numbers.
 */
const getContractInvocationPayload = ({
  evmContractAddress,
  functionSelector,
  encodedArgs,
  deadline,
  nonce,
}) => {
  const LOGIC_CALL_MSG_ID = 0;

  const abiCoder = new ethers.utils.AbiCoder();

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddress,
      nonce,
      deadline,
      ethers.utils.hexlify(
        ethers.utils.concat([functionSelector, encodedArgs]),
      ),
    ],
  );

  return Array.from(ethers.utils.arrayify(payload));
};

/**
 * @satisfies {OrchestrationFlow}
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
 *   contractInvocationDetails: {
 *     evmContractAddress: string;
 *     functionSelector: string;
 *     encodedArgs: string;
 *     nonce: number;
 *     deadline: number;
 *   };
 * }} offerArgs
 */
export const sendIt = async (
  orch,
  { sharedLocalAccountP, log, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  const {
    destAddr,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationDetails,
  } = offerArgs;

  const { evmContractAddress, functionSelector, encodedArgs, nonce, deadline } =
    contractInvocationDetails;

  void log(`offer args`);
  void log(`evmContractAddress:${evmContractAddress}`);
  void log(`functionSelector:${functionSelector}`);
  void log(`encodedArgs:${encodedArgs}`);
  void log(`nonce:${nonce}`);

  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);

  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  void log(`got info for denoms: ${assets.map(a => a.denom).join(', ')}`);
  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );

  const osmosisChain = await orch.getChain('osmosis');
  const info = await osmosisChain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');
  void log(`got info for chain: ${chainId}`);

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;
  await localTransfer(seat, sharedLocalAccount, give);

  void log(`completed transfer to localAccount`);

  const payload =
    type === 1 || type === 2
      ? getContractInvocationPayload({
          evmContractAddress,
          functionSelector,
          encodedArgs,
          nonce,
          deadline,
        })
      : null;

  void log(`payload received`);

  const memoToAxelar = {
    destination_chain: destinationEVMChain,
    destination_address: destAddr,
    payload,
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
        value: addresses.OSMOSIS_RECEIVER,
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
