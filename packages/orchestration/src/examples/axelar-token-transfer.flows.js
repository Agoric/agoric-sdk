import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '@agoric/orchestration/src/exos/local-orchestration-account.js';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration/src/types.js';
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
 *   contractInvocationPayload: number[];
 * }} offerArgs
 */
export const sendTokensToEVM = async (
  orch,
  { sharedLocalAccountP, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  const { destinationAddress, destinationEVMChain } = offerArgs;
  console.log('Inside sendTokensToEVM');
  console.log(
    'Offer Args',
    JSON.stringify({
      destinationAddress,
      destinationEVMChain,
    }),
  );

  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  console.log('_kw, amt', _kw, amt);

  const agoric = await orch.getChain('agoric');
  console.log('Agoric Chain ID:', (await agoric.getChainInfo()).chainId);

  const assets = await agoric.getVBankAssetInfo();
  console.log(`Denoms: ${assets.map(a => a.denom).join(', ')}`);

  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );

  const osmosisChain = await orch.getChain('osmosis');
  console.log('Osmosis Chain ID:', (await osmosisChain.getChainInfo()).chainId);

  const info = await osmosisChain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;
  await localTransfer(seat, sharedLocalAccount, give);
  console.log('After local transfer');

  const memoToAxelar = {
    destination_chain: destinationEVMChain,
    destination_address: destinationAddress,
    payload: null,
    type: 3,
  };

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
    console.log(`Initiating IBC Transfer...`);
    console.log(`DENOM of token:${denom}`);

    await sharedLocalAccount.transfer(
      {
        // TODO: dont use a hardcoded OSMOSIS address
        value: addresses.OSMOSIS_RECEIVER,
        encoding: 'bech32',
        chainId,
      },
      {
        denom,
        value: amt.value,
      },
      { memo: JSON.stringify(memo) },
    );

    console.log(`Completed transfer to ${destinationAddress}`);
  } catch (e) {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
};
harden(sendTokensToEVM);
