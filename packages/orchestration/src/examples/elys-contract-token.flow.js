import { Fail } from '@endo/errors';
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
} from '@agoric/cosmic-proto/stride/stakeibc/tx.js';
import { tryDecodeResponse } from '../utils/cosmos.js';
import { FeeConfigShape } from './elys-contract-type-gaurd.js';

/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 */
const trace = makeTracer('StrideStakingFlow');

/**
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {ChainAddress, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Passable} from '@endo/pass-style';
 * @import {SupportedHostChainShape} from './elys-contract-tap-kit.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} ctx
 * @param {VTransferIBCEvent & Passable} incomingIbcTransferEvent
 * @param {OrchestrationAccount<{ chainId: string }> & Passable} localAccount,
 * @param {ChainAddress} localAccountAddress,
 * @param {OrchestrationAccount<{ chainId: string }> & Passable} strideICAAccount,
 * @param {ChainAddress} strideICAAddress,
 * @param {OrchestrationAccount<{ chainId: string }> & Passable} elysICAAccount,
 * @param {ChainAddress} elysICAAddress,
 * @param {MapStore<string, SupportedHostChainShape>} supportedHostChains,
 * @param {string} elysToAgoricChannel,
 * @param {string} AgoricToElysChannel,
 * @param {MapStore<string, string>} stDenomOnElysTohostToAgoricChannelMap,
 * @param {string} agoricBech32Prefix,
 * @param {string} strideBech32Prefix,
 * @param {string} elysBech32Prefix,
 * @param {FeeConfigShape} feeConfig,,
 */
// * @param {StrideStakingTapState & Passable} state/
export const tokenMovementAndStrideLSDFlow = async (
  orch,
  ctx,
  incomingIbcTransferEvent,
  localAccount,
  localAccountAddress,
  strideICAAccount,
  strideICAAddress,
  elysICAAccount,
  elysICAAddress,
  supportedHostChains,
  elysToAgoricChannel,
  AgoricToElysChannel,
  stDenomOnElysTohostToAgoricChannelMap,
  agoricBech32Prefix,
  strideBech32Prefix,
  elysBech32Prefix,
  feeConfig,
) => {
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
    let incomingTokenAmount;
    try {
      incomingTokenAmount = BigInt(tx.amount);
    } catch (error) {
      trace('Error converting tx.amount to BigInt', error);
      return;
    }

    let amountAfterFeeDeduction;
    // deduct fees
    try {
      amountAfterFeeDeduction = await deductedFeeAmount(
        localAccount,
        feeConfig,
        incomingTokenAmount,
        tx.denom,
        true,
      );
      trace('amount after fee deduction', amountAfterFeeDeduction);
    } catch (error) {
      trace('Error deducting fees', error);
      return;
    }

    // Move to host chain ICA account
    try {
      await moveToHostChain(
        localAccount,
        hostChainInfo.hostICAAccountAddress,
        hostChainInfo.ibcDenomOnAgoric,
        amountAfterFeeDeduction,
      );
    } catch (error) {
      await handleTransferFailure(
        localAccount,
        senderAgoricChainAddress,
        hostChainInfo.ibcDenomOnAgoric,
        amountAfterFeeDeduction,
        'Moving tokens from agoric to host-chain failed, sending it to users wallet on agoric chain',
      );
      return;
    }
    // Move to stride ICA from host ICA account
    const senderHostChainAddress = {
      chainId: hostChainInfo.hostICAAccountAddress.chainId,
      encoding: hostChainInfo.hostICAAccountAddress.encoding,
      value: tx.sender,
    };
    try {
      trace('Moving tokens to stride from host-chain');
      await hostChainInfo.hostICAAccount.transfer(strideICAAddress, {
        denom: tx.denom,
        value: amountAfterFeeDeduction,
      });
    } catch (error) {
      await handleTransferFailure(
        hostChainInfo.hostICAAccount,
        senderHostChainAddress,
        tx.denom,
        amountAfterFeeDeduction,
        'Moving tokens to stride from host-chain failed, sending it to users wallet on host chain',
      );
      return;
    }
    // Liquid stake on stride chain
    /** @type {MsgLiquidStakeResponse} */
    let stakingResponse;
    try {
      stakingResponse = await liquidStakeOnStride(
        strideICAAccount,
        strideICAAddress,
        amountAfterFeeDeduction,
        tx.denom,
      );
    } catch (error) {
      await handleTransferFailure(
        strideICAAccount,
        senderStrideChainAddress,
        hostChainInfo.ibcDenomOnStride,
        amountAfterFeeDeduction,
        'Liquid staking failed, sending tokens to users wallet on stride chain',
      );
      return;
    }
    // Move stTokens to Elys chain
    try {
      await moveStTokensToElys(
        strideICAAccount,
        senderElysChainAddress,
        stakingResponse.stToken,
      );
    } catch (error) {
      await handleTransferFailure(
        strideICAAccount,
        senderStrideChainAddress,
        stakingResponse.stToken.denom,
        BigInt(stakingResponse.stToken.amount),
        'Moving stTokens to elys from stride chain failed, sending it to users wallet on stride chain',
      );
      return;
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

    let amountAfterFeeDeduction;
    // deduct fees
    try {
      amountAfterFeeDeduction = await deductedFeeAmount(
        localAccount,
        feeConfig,
        incomingStTokenAmount,
        tx.denom,
        false,
      );
      trace('amount after fee deduction', amountAfterFeeDeduction);
    } catch (error) {
      trace('Error deducting fees', error);
      return;
    }

    const ibcDenomOnAgoricFromElys = `ibc/${denomHash({ denom: `st${tx.denom}`, channelId: AgoricToElysChannel })}`;
    trace(`LiquidStakeRedeem: Received ${tx.denom}`);
    trace(`LiquidStakeRedeem: Moving ${ibcDenomOnAgoricFromElys} to elys ICA`);
    // Transfer to elys ICA account
    try {
      await localAccount.transfer(elysICAAddress, {
        denom: ibcDenomOnAgoricFromElys,
        value: amountAfterFeeDeduction,
      });
    } catch (error) {
      await handleTransferFailure(
        localAccount,
        senderAgoricChainAddress,
        ibcDenomOnAgoricFromElys,
        amountAfterFeeDeduction,
        'Moving stTokens to elys ICA from agoric chain failed, sending it to users wallet on agoric chain',
      );
      return;
    }
    // Transfer to stride from elys ICA
    try {
      await elysICAAccount.transfer(strideICAAddress, {
        denom: tx.denom,
        value: amountAfterFeeDeduction,
      });
    } catch (error) {
      await handleTransferFailure(
        elysICAAccount,
        senderElysChainAddress,
        tx.denom,
        amountAfterFeeDeduction,
        'Moving stTokens to stride ICA from elys ICA failed, sending it to users wallet on elys chain',
      );
      return;
    }
    // Redeem on stride chain
    try {
      const senderNativeAddress = deriveAddress(
        tx.sender,
        hostChainInfo.bech32Prefix,
      );
      trace(
        `Derived Native address from elys address ${tx.sender} is ${senderNativeAddress}`,
      );
      await redeemOnStride(
        strideICAAccount,
        strideICAAddress,
        tx.amount,
        hostChainInfo.hostICAAccountAddress.chainId,
        senderNativeAddress,
      );
    } catch (error) {
      await handleTransferFailure(
        strideICAAccount,
        senderStrideChainAddress,
        `st${hostChainInfo.nativeDenom}`,
        amountAfterFeeDeduction,
        'Unstaking on stride failed, sending it to users wallet on stride chain',
      );
      return;
    }
  }
};
harden(tokenMovementAndStrideLSDFlow);

const deriveAddress = (sender, hrp) => {
  const { prefix, bytes } = decodeBech32(sender);
  const derivedAddress = encodeBech32(hrp, bytes);
  return harden(derivedAddress);
};
harden(deriveAddress);

/**
 * @param {OrchestrationAccount<any>} account
 * @param {ChainAddress} address
 * @param {string} denom
 * @param {bigint} amount
 * @param {string} traceMessage
 */
const handleTransferFailure = async (
  account,
  address,
  denom,
  amount,
  traceMessage,
) => {
  trace(traceMessage);
  try {
    await account.send(address, { denom, value: amount });
  } catch (error) {
    trace(
      `Failed to send tokens to ${address.value}, denom: ${denom}, amount: ${amount}`,
      error,
    );
  }
};
harden(handleTransferFailure);
/**
 * @param {OrchestrationAccount<{ chainId: string }>} localAccount
 * @param {ChainAddress} hostICAAccountAddress
 * @param {string} ibcDenomOnAgoric
 * @param {bigint} amount
 */
const moveToHostChain = async (
  localAccount,
  hostICAAccountAddress,
  ibcDenomOnAgoric,
  amount,
) => {
  trace('Moving funds to host-chain');
  trace('hostICAAddress ', hostICAAccountAddress);
  trace('ibcDenomOnAgoric ', ibcDenomOnAgoric);
  trace('amount', amount);

  await localAccount.transfer(hostICAAccountAddress, {
    denom: ibcDenomOnAgoric,
    value: amount,
  });
};
harden(moveToHostChain);
/**
 * @param {OrchestrationAccount<{ chainId: string }>} strideICAAccount
 * @param {ChainAddress} strideICAAddress
 * @param {bigint} amount
 * @param {string} denom
 * @returns
 */
const liquidStakeOnStride = async (
  strideICAAccount,
  strideICAAddress,
  amount,
  denom,
) => {
  const strideLiquidStakeMsg = Any.toJSON(
    MsgLiquidStake.toProtoMsg({
      creator: strideICAAddress.value,
      amount: amount.toString(),
      hostDenom: denom,
    }),
  );

  trace('Calling liquid stake');
  const stakingResponse = await strideICAAccount.executeEncodedTx([
    strideLiquidStakeMsg,
  ]);
  return harden(
    tryDecodeResponse(stakingResponse, MsgLiquidStakeResponse.fromProtoMsg),
  );
};
harden(liquidStakeOnStride);

/**
 * @param {OrchestrationAccount<{ chainId: string }>} strideICAAccount
 * @param {ChainAddress} senderElysChainAddress
 * @param {Coin} stToken
 */
const moveStTokensToElys = async (
  strideICAAccount,
  senderElysChainAddress,
  stToken,
) => {
  trace('Moving stTokens to elys from stride');
  await strideICAAccount.transfer(senderElysChainAddress, {
    denom: stToken.denom,
    value: BigInt(stToken.amount),
  });
};
harden(moveStTokensToElys);

/**
 * @param {OrchestrationAccount<{ chainId: string }>} strideICAAccount
 * @param {ChainAddress} strideICAAddress
 * @param {string} amount
 * @param {string} hostZone
 * @param {string} receiver
 * @returns
 */
const redeemOnStride = async (
  strideICAAccount,
  strideICAAddress,
  amount,
  hostZone,
  receiver,
) => {
  const strideRedeemStakeMsg = Any.toJSON(
    MsgRedeemStake.toProtoMsg({
      creator: strideICAAddress.value,
      amount,
      hostZone,
      receiver,
    }),
  );

  return await strideICAAccount.executeEncodedTx([strideRedeemStakeMsg]);
};
harden(redeemOnStride);

/**
 * @param {OrchestrationAccount<any>} account
 * @param {FeeConfigShape} feeConfig
 * @param {bigint} amount
 * @param {string} denom
 * @param {boolean} onBoard
 * @returns
 */
const deductedFeeAmount = async (
  account,
  feeConfig,
  amount,
  denom,
  onBoard,
) => {
  let feeAmount;
  if (onBoard) {
    feeAmount =
      (amount * feeConfig.onBoardRate.nominator) /
      feeConfig.onBoardRate.denominator;
  } else {
    feeAmount =
      (amount * feeConfig.offBoardRate.nominator) /
      feeConfig.offBoardRate.denominator;
  }

  const finalAmount = amount - feeAmount;
  if (finalAmount < 0) {
    throw Fail`Fee is more than the amount`;
  }

  const feeReceiverChainAddress = {
    chainId: account.getAddress().chainId,
    encoding: account.getAddress().encoding,
    value: feeConfig.feeCollector,
  };

  trace(`sending fee amount ${feeAmount} to ${feeConfig.feeCollector}`);
  await account.send(feeReceiverChainAddress, {
    denom,
    value: feeAmount,
  });
  return harden(finalAmount);
};
