import { Fail } from '@endo/errors';
import { makeScalarMapStore } from '@agoric/store';
import { denomHash } from '../utils/denomHash.js';
import { makeTracer } from '@agoric/internal';
import {
  decodeBech32,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgLiquidStake,
  MsgLiquidStakeResponse,
  MsgRedeemStake,
} from '../../cosmic-proto/dist/codegen/stride/stakeibc/tx.js';
import { tryDecodeResponse } from '../utils/cosmos.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStrideStakingTap, SupportedHostChainShape} from './elys-contract-tap-kit.js';
 * @import {ChainHub} from '../exos/chain-hub.js';
 */
const trace = makeTracer('StrideStakingFlow');

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStrideStakingTap: MakeStrideStakingTap;
 *   chainHub: GuestInterface<ChainHub>;
 * }} ctx
 * @param {{
 *   chainNames: string[];
 *   supportedHostChains: MapStore<any, any>;
 *   stDenomOnElysTohostToAgoricChannelMap: MapStore<any, any>;
 * }} offerArgs
 */
export const makeICAHookAccounts = async (
  orch,
  { makeStrideStakingTap, chainHub },
  { chainNames, supportedHostChains, stDenomOnElysTohostToAgoricChannelMap },
) => {
  const allRemoteChains = await Promise.all(
    chainNames.map(n => orch.getChain(n)),
  );

  // Agoric local account
  const agoric = await orch.getChain('agoric');
  const { chainId: agoricChainId, bech32Prefix: agoricBech32Prefix } =
    await agoric.getChainInfo();
  const localAccount = await agoric.makeAccount();
  const localAccountAddress = localAccount.getAddress();

  // stride ICA account
  const stride = await orch.getChain('stride');
  const { chainId: strideChainId, bech32Prefix: strideBech32Prefix } =
    await stride.getChainInfo();
  const strideICAAccount = await stride.makeAccount();
  const strideICAAddress = strideICAAccount.getAddress();

  // Elys ICA account
  const elys = await orch.getChain('elys');
  const { chainId: elysChainId, bech32Prefix: elysBech32Prefix } =
    await elys.getChainInfo();
  const elysICAAccount = await elys.makeAccount();
  const elysICAAddress = elysICAAccount.getAddress();

  const { transferChannel: transferChannelAgoricElys } =
    await chainHub.getConnectionInfo(agoricChainId, elysChainId);
  const { transferChannel: transferChannelStrideElys } =
    await chainHub.getConnectionInfo(strideChainId, elysChainId);

  // ICA account on all the supported host chains
  for (const [index, remoteChain] of allRemoteChains.entries()) {
    const chainInfo = await remoteChain.getChainInfo();
    const { chainId, stakingTokens, bech32Prefix } = chainInfo;
    stakingTokens || Fail`${chainId} does not have stakingTokens in config`;

    const nativeDenom = stakingTokens[0].denom;
    trace('NativeDenom ', nativeDenom);
    nativeDenom ||
      Fail`${chainId || chainId} does not have stakingTokens in config`;

    const ICAAccount = await remoteChain.makeAccount();
    const ICAAddress = ICAAccount.getAddress();

    // get the connection info between agoric and remote chain
    const { transferChannel } = await chainHub.getConnectionInfo(
      agoricChainId,
      chainId,
    );
    const { transferChannel: transferChannelhostStride } =
      await chainHub.getConnectionInfo(chainId, strideChainId);

    const ibcDenomOnAgoric = `ibc/${denomHash({ denom: nativeDenom, channelId: transferChannel.channelId })}`;
    const ibcDenomOnStride = `ibc/${denomHash({ denom: nativeDenom, channelId: transferChannelhostStride.channelId })}`;

    // Required in retrieving native token back from stTokens on elys chain
    const stTokenDenomOnElys = `ibc/${denomHash({ denom: `st${nativeDenom}`, channelId: transferChannelStrideElys.channelId })}`;
    stDenomOnElysTohostToAgoricChannelMap.init(
      stTokenDenomOnElys,
      transferChannel.counterPartyChannelId,
    );

    const chainName = chainNames[index];

    /** @type {SupportedHostChainShape} */
    const hostChainInfo = {
      hostToAgoricChannel: transferChannel.counterPartyChannelId,
      nativeDenom,
      ibcDenomOnAgoric,
      ibcDenomOnStride,
      hostICAAccount: ICAAccount,
      hostICAAccountAddress: ICAAddress,
      bech32Prefix,
    };
    supportedHostChains.init(
      transferChannel.counterPartyChannelId,
      hostChainInfo,
    );
  }

  const tap = makeStrideStakingTap({
    localAccount,
    localAccountAddress,
    strideICAAccount,
    strideICAAddress,
    elysICAAccount,
    elysICAAddress,
    supportedHostChains,
    elysToAgoricChannel: transferChannelAgoricElys.counterPartyChannelId,
    AgoricToElysChannel: transferChannelAgoricElys.channelId,
    stDenomOnElysTohostToAgoricChannelMap,
    agoricBech32Prefix,
    strideBech32Prefix,
    elysBech32Prefix,
  });

  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);

  return localAccount;
};
harden(makeICAHookAccounts);

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {ChainAddress, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {Passable} from '@endo/pass-style';
 * @import {StrideStakingTapState} from './elys-contract-tap-kit.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   chainHub: GuestInterface<ChainHub>;
 * }} ctx
 * @param {VTransferIBCEvent & Passable} incomingIbcTransferEvent
 * @param {StrideStakingTapState & Passable} state
 */
export const tokenMovementAndStrideLSDFlow = async (
  orch,
  ctx,
  incomingIbcTransferEvent,
  state,
) => {
  const {
    localAccount,
    localAccountAddress,
    elysICAAddress,
    elysICAAccount,
    AgoricToElysChannel,
    supportedHostChains,
    stDenomOnElysTohostToAgoricChannelMap,
    elysToAgoricChannel,
    agoricBech32Prefix,
    strideICAAccount,
    strideICAAddress,
    strideBech32Prefix,
    elysBech32Prefix,
  } = state;

  // Look for interested incoming tokens
  // Either supported chains Staking denoms or stTokens from elys chain
  if (
    !supportedHostChains.has(incomingIbcTransferEvent.packet.source_channel) &&
    incomingIbcTransferEvent.packet.source_channel !== elysToAgoricChannel
  ) {
    return;
  }

  const hostChainInfo = supportedHostChains.get(
    incomingIbcTransferEvent.packet.source_channel,
  );

  const tx = /** @type {FungibleTokenPacketData} */ (
    JSON.parse(atob(incomingIbcTransferEvent.packet.data))
  );
  trace('Received Fungible Token Packet Data', tx);

  // ignore the outgoing transfers
  if (tx.receiver !== localAccountAddress.value) {
    return;
  }

  const senderAgoricAddress = deriveAddress(tx.sender, agoricBech32Prefix);
  const senderStrideAddress = deriveAddress(tx.sender, strideBech32Prefix);
  const senderElysAddress = deriveAddress(tx.sender, elysBech32Prefix);
  const senderAgoricChainAddress = {
    chainId: localAccountAddress.chainId,
    encoding: localAccountAddress.encoding,
    value: senderAgoricAddress,
  };
  const senderStrideChainAddress = {
    chainId: strideICAAddress.chainId,
    encoding: strideICAAddress.encoding,
    value: senderStrideAddress,
  };
  const senderElysChainAddress = {
    chainId: elysICAAddress.chainId,
    encoding: elysICAAddress.encoding,
    value: senderElysAddress,
  };

  // Receiving tokens for liquid staking
  if (hostChainInfo !== undefined) {
    if (tx.denom !== hostChainInfo.nativeDenom) {
      return;
    }
    const {
      ibcDenomOnStride,
      ibcDenomOnAgoric,
      hostICAAccount,
      hostICAAccountAddress,
    } = hostChainInfo;

    trace('LiquidStake: Moving funds to host-chain');
    trace('hostICAAddress ', hostICAAccountAddress);
    trace('ibcDenomOnAgoric ', ibcDenomOnAgoric);
    trace('amount', BigInt(tx.amount));

    let incomingTokenAmount;
    try {
      incomingTokenAmount = BigInt(tx.amount);
    } catch (error) {
      trace('Error converting tx.amount to BigInt', error);
      return;
    }

    // Move to host chain ICA account
    try {
      await localAccount.transfer(hostICAAccountAddress, {
        denom: hostChainInfo.ibcDenomOnAgoric,
        value: incomingTokenAmount,
      });
    } catch (_result) {
      trace(
        'LiquidStake: Moving tokens to host-chain failed, sending it to users wallet on agoric chain',
      );

      try {
        await localAccount.send(senderAgoricChainAddress, {
          denom: ibcDenomOnAgoric,
          value: incomingTokenAmount,
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStake: Moving tokens to users wallet ${tx.sender} failed, denom ${ibcDenomOnAgoric}, amount ${incomingTokenAmount}`,
        );
        return;
      }
    }

    // Move to stride ICA from host ICA account
    try {
      await hostICAAccount.transfer(strideICAAddress, {
        denom: tx.denom, // denom received from host chain
        value: incomingTokenAmount,
      });
    } catch (_result) {
      trace(
        'LiquidStake: Moving tokens to stride from host-chain failed, sending it to users wallet on host chain',
      );
      // tx.sender == senderHostAddress
      const senderHostChainAddress = {
        chainId: hostICAAccountAddress.chainId,
        encoding: hostICAAccountAddress.encoding,
        value: tx.sender,
      };

      try {
        await hostICAAccount.send(senderHostChainAddress, {
          denom: tx.denom,
          value: incomingTokenAmount,
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStake: Moving tokens to users wallet ${tx.sender} on ${hostICAAccountAddress.chainId}  failed, denom ${tx.denom}, amount ${incomingTokenAmount}`,
        );
        return;
      }
    }

    // Liquid stake on stride chain
    let stakingResponse;
    try {
      const strideLiquidStakeMsg = Any.toJSON(
        MsgLiquidStake.toProtoMsg({
          creator: strideICAAddress.value,
          amount: incomingTokenAmount.toString(),
          hostDenom: tx.denom,
        }),
      );

      trace('LiquidStake: Calling liquid stake');
      stakingResponse = await strideICAAccount.executeEncodedTx([
        strideLiquidStakeMsg,
      ]);
    } catch (_result) {
      trace(
        'LiquidStakeFailed: Liquid staking failed, sending tokens to users wallet on stride chain',
      );

      try {
        await strideICAAccount.send(senderStrideChainAddress, {
          denom: ibcDenomOnStride,
          value: incomingTokenAmount,
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStake: Moving tokens to users wallet on ${strideICAAddress.chainId}  failed, denom ${ibcDenomOnStride}, amount ${incomingTokenAmount}`,
        );
        return;
      }
    }

    // Response should never throw error
    const strideLSDResponse = tryDecodeResponse(
      stakingResponse,
      MsgLiquidStakeResponse.fromProtoMsg,
    );
    trace('Stride staking response : ', strideLSDResponse);

    // Move stTokens to Elys chain
    try {
      trace('LiquidStake: Moving stTokens to elys from stride');
      await strideICAAccount.transfer(senderElysChainAddress, {
        denom: strideLSDResponse.stToken.denom,
        value: BigInt(strideLSDResponse.stToken.amount),
      });
    } catch (_result) {
      trace(
        'LiquidStake: Moving stTokens to elys from stride chain failed, sending it to users wallet on stride chain',
      );
      try {
        await strideICAAccount.send(senderStrideChainAddress, {
          denom: strideLSDResponse.stToken.denom,
          value: BigInt(strideLSDResponse.stToken.amount),
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStake: Moving stTokens to users wallet ${tx.sender} on ${strideICAAddress.chainId}  failed, denom ${strideLSDResponse.stToken.denom}, amount ${strideLSDResponse.stToken.amount}`,
        );
        return;
      }
    }
  } else {
    const hostToAgoricChannel = stDenomOnElysTohostToAgoricChannelMap.get(
      tx.denom,
    );
    if (hostToAgoricChannel === undefined) {
      return;
    }
    const hostChainInfo = supportedHostChains.get(hostToAgoricChannel);
    if (hostChainInfo === undefined) {
      return;
    }
    let incomingStTokenAmount;
    try {
      incomingStTokenAmount = BigInt(tx.amount);
    } catch (error) {
      trace('Error converting tx.amount to BigInt', error);
      return;
    }
    const ibcDenomOnAgoricFromElys = `ibc/${denomHash({ denom: `st${tx.denom}`, channelId: AgoricToElysChannel })}`;

    trace(`LiquidStakeRedeem: Received ${tx.denom}`);
    trace(`LiquidStakeRedeem: Moving ${ibcDenomOnAgoricFromElys} to elys ICA`);

    // Transfer to elys ICA account
    try {
      trace('LiquidStakeRedeem: Moving stTokens to elys ICA from agoric');
      await localAccount.transfer(elysICAAddress, {
        denom: ibcDenomOnAgoricFromElys,
        value: incomingStTokenAmount,
      });
    } catch (_result) {
      trace(
        'LiquidStakeRedeem: Moving stTokens to elys ICA from agoric chain failed, sending it to users wallet on agoric chain',
      );
      try {
        await localAccount.send(senderAgoricChainAddress, {
          denom: ibcDenomOnAgoricFromElys,
          value: incomingStTokenAmount,
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStakeRedeem: Moving stTokens to users wallet ${tx.sender} on ${localAccountAddress.chainId}  failed, denom ${ibcDenomOnAgoricFromElys}, amount ${tx.amount}`,
        );
        return;
      }
    }

    // Transfer to stride from elys ICA
    try {
      trace('LiquidStakeRedeem: Moving stTokens to stride from elys ICA');
      await elysICAAccount.transfer(strideICAAddress, {
        denom: tx.denom,
        value: incomingStTokenAmount,
      });
    } catch (_result) {
      trace(
        'LiquidStakeRedeem: Moving stTokens to stride ICA from elys ICA failed, sending it to users wallet on elys chain',
      );
      try {
        await elysICAAccount.send(senderElysChainAddress, {
          denom: tx.denom,
          value: incomingStTokenAmount,
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStakeRedeem: Moving stTokens to users wallet ${tx.sender} on ${elysICAAddress.chainId}  failed, denom ${tx.denom}, amount ${tx.amount}`,
        );
        return;
      }
    }

    // Redeem on stride chain
    try {
      trace('LiquidStakeRedeem: Unstaking stTokens on stride');
      // TODO: verify address derivation
      const senderNativeAddress = deriveAddress(
        tx.sender,
        hostChainInfo.bech32Prefix,
      );
      trace(
        `Derived Native address from elys address ${tx.sender} is ${senderNativeAddress}`,
      );

      const strideRedeemStakeMsg = Any.toJSON(
        MsgRedeemStake.toProtoMsg({
          creator: strideICAAddress.value,
          amount: tx.amount,
          hostZone: hostChainInfo.hostICAAccountAddress.chainId,
          receiver: senderNativeAddress,
        }),
      );

      await strideICAAccount.executeEncodedTx([strideRedeemStakeMsg]);
    } catch (_result) {
      trace(
        'LiquidStakeRedeem: Unstaking on stride failed, sending it to users wallet on stride chain',
      );
      const stDenom = `st${hostChainInfo.nativeDenom}`;
      try {
        await strideICAAccount.send(senderStrideChainAddress, {
          denom: stDenom,
          value: incomingStTokenAmount,
        });
        return;
      } catch (_result) {
        trace(
          `LiquidStakeRedeem: Moving stTokens to users wallet ${tx.sender} on ${strideICAAddress.chainId}  failed, denom ${stDenom}, amount ${tx.amount}`,
        );
        return;
      }
    }
  }
};
harden(tokenMovementAndStrideLSDFlow);

const deriveAddress = (sender, hrp) => {
  const { prefix, bytes } = decodeBech32(sender);
  const derivedAddress = encodeBech32(hrp, bytes);
  return harden(derivedAddress);
};
