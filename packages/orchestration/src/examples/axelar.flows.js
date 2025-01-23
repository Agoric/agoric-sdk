import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods, OrchestrationAccountCommon, OrchestrationAccount, IBCConnectionInfo, ChainAddress} from '../types.js';
 */

const { entries } = Object;

const AGORIC_TO_OSMOSIS_CHANNEL_ID = 'channel-65';
const OSMOSIS_TO_AXELAR_CHANNEL_ID = 'channel-4118';
const DENOM_SENDING_TOKEN =
  'ibc/D6077E64A3747322E1C053ED156B902F78CC40AE4C7240349A26E3BC216497BF';
const DENOM_GAS_FEE = 'ubld';
const AMOUNT_IN_ATOMIC_UNITS = '1000000';

/**
 * "Axelar Network utilizes a canonical account axelar1dv... to facilitate GMP
 * communication." --
 * https://github.com/axelarnetwork/evm-cosmos-gmp-sample/blob/main/native-integration/README.md
 * 2bfc3ac 11 Aug 2023
 */
const AXELAR_GMP_ADDRESS =
  'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5';

/**
 * https://github.com/axelarnetwork/evm-cosmos-gmp-sample/tree/main/native-integration#cosmos---evm
 */
const AxelarGMPType = /** @type {const} */ ({
  pureMessage: 1,
  messageWithToken: 2,
  pureTokenTransfer: 3,
});
harden(AxelarGMPType);

const OSMOSIS_ADDRESS = 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj';

const DESTINATION_EVM_ADDRESS = '0x20E68F6c276AC6E297aC46c84Ab260928276691D';
const DESTINATION_EVM_CHAIN = 'avalanche';

/**
 * @template {AxelarConfig} AC
 * @param {keyof AC['evmChains']} destinationChain
 * @param {ChainAddress['value']} destinationAddress 0x...
 */
const axelarTransferMemo = (destinationChain, destinationAddress) =>
  harden({
    destination_chain: destinationChain,
    destination_address: destinationAddress,
    type: AxelarGMPType.pureTokenTransfer,
  });

// TODO use case should be handled by `sendIt` based on the destination
/**
 * @deprecated `sendIt` should handle this
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; destAddr: string }} offerArgs
 */
export const sendByAxelar = async (
  orch,
  { sharedLocalAccountP, log, zoeTools: { localTransfer, withdrawToSeat } },
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
   * @type {OrchestrationAccount<{ chainId: 'agoric' }>}
   */
  // @ts-expect-error XXX methods returning vows https://github.com/Agoric/agoric-sdk/issues/9822
  const sharedLocalAccount = await sharedLocalAccountP;
  await localTransfer(seat, sharedLocalAccount, give);

  void log(`completed transfer to localAccount`);

  const memoToAxelar = axelarTransferMemo(chainName, destAddr);

  const memo = {
    forward: {
      receiver: AXELAR_GMP_ADDRESS,
      port: 'transfer',
      channel: OSMOSIS_TO_AXELAR_CHANNEL_ID,
      timeout: '10m',
      retries: 2,
      next: JSON.stringify(memoToAxelar),
    },
  };

  //   const payload = [
  //     {
  //       typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
  //       value: tx_1.MsgTransfer.fromPartial({
  //         sender: senderAddress,
  //         receiver: OSMOSIS_ADDRESS,
  //         token: {
  //           denom: DENOM_SENDING_TOKEN,
  //           amount: AMOUNT_IN_ATOMIC_UNITS,
  //         },
  //         sourceChannel: AGORIC_TO_OSMOSIS_CHANNEL_ID,
  //         sourcePort: 'transfer',
  //         timeoutTimestamp: BigInt((Date.now() + 3 * 60 * 1000) * 1_000_000),
  //         memo: JSON.stringify(memo),
  //       }),
  //     },
  //   ];
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
harden(sendByAxelar);
