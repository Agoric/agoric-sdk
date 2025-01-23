import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';
import { AxelarTestNet } from '../fixtures/axelar-testnet.js';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods, OrchestrationAccountCommon, OrchestrationAccount, IBCConnectionInfo, ChainAddress, ForwardInfo} from '../types.js';
 * @import {IBCChannelID} from '@agoric/vats';
 * @import {AxelarConfig} from '../fixtures/axelar-testnet.js'
 */

const { entries } = Object;

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
const makeGMPTransfer = (destinationChain, destinationAddress) =>
  harden({
    destination_chain: destinationChain,
    destination_address: destinationAddress,
    payload: null, // TODO: prune? irrelevant?
    type: AxelarGMPType.pureTokenTransfer,
  });

/**
 * @template GMP
 * @param {IBCChannelID} channel
 * @param {GMP} gmpMessage
 * @returns {{
 *   forward: Omit<ForwardInfo['forward'], 'next'> & { next?: string };
 * }}
 */
const forwardToGMP = (channel, gmpMessage) =>
  harden({
    forward: {
      receiver: AXELAR_GMP_ADDRESS,
      port: 'transfer',
      channel,
      timeout: '10m',
      retries: 2,
      next: JSON.stringify(gmpMessage),
    },
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
  debugger; // XXX
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

  const relayChain =
    chainName in AxelarTestNet.evmChains ? 'axelar' : chainName; // XXX
  const chain = await orch.getChain(relayChain);
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

  const txferToDestAddr = makeGMPTransfer(chainName, destAddr);

  const txfrViaGMP = forwardToGMP(
    AxelarTestNet.ibcConnections.osmosis.transferChannel.counterPartyChannelId,
    txferToDestAddr,
  );

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

  /** @satisfies {ChainAddress} */
  const gmpRelay = {
    value: AXELAR_GMP_ADDRESS,
    encoding: 'bech32',
    chainId,
  };

  try {
    await sharedLocalAccount.transfer(
      gmpRelay,
      { denom, value: amt.value },
      { memo: JSON.stringify(txferToDestAddr) },
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
