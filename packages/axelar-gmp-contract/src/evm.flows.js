import { Fail, makeError, q } from '@endo/errors';
import { makeTracer, NonNullish } from '@agoric/internal';
import { denomHash } from '@agoric/orchestration/src/utils/denomHash.js';
import { gmpAddresses, GMPMessageType } from '../utils/gmp.js';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeEvmAccountKit} from './evm-account-kit.js';
 * @import {ChainHub} from '@agoric/orchestration/src/exos/chain-hub.js';
 * @import {Vow} from '@agoric/vow';
 * @import {ZCFSeat, AmountKeywordRecord} from '@agoric/zoe';
 * @import {LocalAccountMethods} from '@agoric/orchestration';
 * @import {AxelarGmpOutgoingMemo} from '../types'
 */

const trace = makeTracer('EvmFlow');

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeEvmAccountKit: MakeEvmAccountKit;
 *   chainHub: GuestInterface<ChainHub>;
 *   log: GuestOf<
 *     (msg: string) => Vow<void>
 *   >;
 *   localTransfer: GuestOf<
 *     (
 *       srcSeat: ZCFSeat,
 *       localAccount: LocalAccountMethods,
 *       amounts: AmountKeywordRecord
 *     ) => Vow<void>
 *   >;
 *   withdrawToSeat: GuestOf<
 *     (
 *       localAccount: LocalAccountMethods,
 *       destSeat: ZCFSeat,
 *       amounts: AmountKeywordRecord
 *     ) => Vow<void>
 *   >;
 * }} ctx
 * @param {ZCFSeat} seat
 */
export const createAndMonitorLCA = async (
  orch,
  { makeEvmAccountKit, chainHub, log, localTransfer, withdrawToSeat },
  seat,
) => {
  void log('Inside createAndMonitorLCA');
  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain('axelar'),
  ]);
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  void log('localAccount created successfully');
  const localChainAddress = await localAccount.getAddress();
  trace('Local Chain Address:', localChainAddress);

  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const { transferChannel } = await chainHub.getConnectionInfo(
    agoricChainId,
    chainId,
  );
  assert(transferChannel.counterPartyChannelId, 'unable to find sourceChannel');

  const localDenom = `ibc/${denomHash({
    denom: remoteDenom,
    channelId: transferChannel.channelId,
  })}`;

  const assets = await agoric.getVBankAssetInfo();
  const info = await remoteChain.getChainInfo();
  const evmAccountKit = makeEvmAccountKit({
    localAccount,
    localChainAddress,
    sourceChannel: transferChannel.counterPartyChannelId,
    remoteDenom,
    localDenom,
    assets,
    remoteChainInfo: info,
  });
  void log('tap created successfully');
  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(evmAccountKit.tap);
  void log('Monitoring transfers setup successfully');

  const { give } = seat.getProposal();
  const [[_kw, amt]] = Object.entries(give);

  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );

  await localTransfer(seat, localAccount, give);

  const factoryContractAddress = '0xef8651dD30cF990A1e831224f2E0996023163A81';

  /** @type {AxelarGmpOutgoingMemo} */
  const memo = {
    destination_chain: 'Ethereum',
    destination_address: factoryContractAddress,
    payload: [],
    type: GMPMessageType.MESSAGE_ONLY,
    fee: {
      amount: '1', // TODO: Get fee amount from api
      recipient: gmpAddresses.AXELAR_GAS,
    },
  };

  try {
    void log('Initiating IBC transfer');
    await localAccount.transfer(
      {
        value: gmpAddresses.AXELAR_GMP,
        encoding: 'bech32',
        chainId,
      },
      {
        denom,
        value: amt.value,
      },
      { memo: JSON.stringify(memo) },
    );

    void log('Done');
  } catch (e) {
    await withdrawToSeat(localAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
  return harden({ invitationMakers: evmAccountKit.invitationMakers });
};
harden(createAndMonitorLCA);
