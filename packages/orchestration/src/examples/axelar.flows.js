import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';
import { ethers } from 'ethers';

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

const getType1Payload = ({ evmContractAddresss, functionSelector, nonce }) => {
  const LOGIC_CALL_MSG_ID = 0;
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const abiCoder = new ethers.utils.AbiCoder();

  const newCountValue = 234;
  const encodedArgs = abiCoder.encode(['uint256'], [newCountValue]);

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddresss,
      nonce,
      deadline,
      ethers.utils.hexlify(
        ethers.utils.concat([functionSelector, encodedArgs]),
      ),
    ],
  );

  return Array.from(ethers.utils.arrayify(payload));
};

export const getPayload = ({ type }) => {
  const abiCoder = new ethers.utils.AbiCoder();

  switch (type) {
    case 1:
      return getType1Payload();
    case 2:
      return Array.from(
        ethers.utils.arrayify(
          abiCoder.encode(
            ['address'],
            ['0x20E68F6c276AC6E297aC46c84Ab260928276691D'],
          ),
        ),
      );
    case 3:
      return null;
    default:
      throw new Error('Invalid payload type');
  }
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
  const { destAddr, type, destinationEVMChain, gasAmount } = offerArgs;

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
  void log(`got info for chain: ${osmosisChain} ${chainId}`);

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
        value: addresses.OSMOSIS,
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
