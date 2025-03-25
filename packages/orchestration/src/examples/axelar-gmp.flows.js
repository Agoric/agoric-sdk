// @ts-check
import { NonNullish } from '@agoric/internal';
import { Fail, makeError, q } from '@endo/errors';
import { buildGMPPayload } from '../utils/gmp.js';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../../src/exos/local-orchestration-account.js';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow} from '../../src/types.js';
 */

const { entries } = Object;

const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
};

/**
 * @typedef {object} ContractInvocationData
 * @property {string} functionSelector - Function selector (4 bytes)
 * @property {string} encodedArgs - ABI encoded arguments
 * @property {number} deadline
 * @property {number} nonce
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{
 *   destinationAddress: string;
 *   type: number;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 *   contractInvocationData: ContractInvocationData;
 * }} offerArgs
 */
export const sendGmp = async (
  orch,
  { log, sharedLocalAccountP, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  const {
    destinationAddress,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationData,
  } = offerArgs;
  log('Inside sendGmp');

  destinationAddress != null || Fail`Destination address must be defined`;
  destinationEVMChain != null || Fail`Destination evm address must be defined`;

  const isContractInvocation = [1, 2].includes(type);
  if (isContractInvocation) {
    gasAmount != null || Fail`gasAmount must be defined`;
    contractInvocationData != null ||
      Fail`contractInvocationData is not defined`;

    ['functionSelector', 'encodedArgs', 'deadline', 'nonce'].every(
      field => contractInvocationData[field] != null,
    ) ||
      Fail`Contract invocation payload is invalid or missing required fields`;
  }

  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  amt.value > 0n || Fail`IBC transfer amount must be greater than zero`;
  console.log('_kw, amt', _kw, amt);

  const payload = buildGMPPayload({
    type,
    evmContractAddress: destinationAddress,
    ...contractInvocationData,
  });
  log(`Payload: ${JSON.stringify(payload)}`);

  const agoric = await orch.getChain('agoric');
  console.log('Agoric Chain ID:', (await agoric.getChainInfo()).chainId);

  const assets = await agoric.getVBankAssetInfo();
  console.log(`Denoms: ${assets.map(a => a.denom).join(', ')}`);

  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );

  const axelarChain = await orch.getChain('axelar');
  console.log('Axelar Chain ID:', (await axelarChain.getChainInfo()).chainId);

  const info = await axelarChain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  await localTransfer(seat, sharedLocalAccount, give);
  log('Local transfer successful');

  const memo = {
    destination_chain: destinationEVMChain,
    destination_address: destinationAddress,
    payload,
    type,
  };

  if (type === 1 || type === 2) {
    memo.fee = {
      amount: String(gasAmount),
      recipient: addresses.AXELAR_GAS,
    };
    log(`Fee object ${JSON.stringify(memo.fee)}`);
  }

  try {
    log(`Initiating IBC Transfer...`);
    log(`DENOM of token:${denom}`);

    await sharedLocalAccount.transfer(
      {
        value: addresses.AXELAR_GMP,
        encoding: 'bech32',
        chainId,
      },
      {
        denom,
        value: amt.value,
      },
      { memo: JSON.stringify(memo) },
    );

    log('Offer successful');
    console.log(`Completed transfer to ${destinationAddress}`);
  } catch (e) {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
};
harden(sendGmp);
