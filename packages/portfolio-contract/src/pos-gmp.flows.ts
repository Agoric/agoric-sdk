/**
 * @file flows for Aave and Compound protocols on EVM chains
 *
 * Since Axelar GMP (General Message Passing) is used in both cases,
 * we use "gmp" in the filename.
 *
 * @see {@link provideEVMAccount}
 * @see {@link CCTP}
 * @see {@link AaveProtocol}
 * @see {@link CompoundProtocol}
 */
import { makeTracer } from '@agoric/internal';
import { encodeHex } from '@agoric/internal/src/hex.js';
import type {
  AccountId,
  Bech32Address,
  Chain,
  DenomAmount,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type ContractCall,
} from '@agoric/orchestration/src/axelar-types.js';
import { leftPadEthAddressTo32Bytes } from '@agoric/orchestration/src/utils/address.js';
import {
  buildGMPPayload,
  gmpAddresses,
} from '@agoric/orchestration/src/utils/gmp.js';
import { fromBech32 } from '@cosmjs/encoding';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import { AxelarChain } from './constants.js';
import { ERC20, makeEVMSession, type EVMT } from './evm-facade.ts';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';
import type { AxelarId } from './portfolio.contract.ts';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';

const trace = makeTracer('GMPF');
const { keys } = Object;

export const provideEVMAccount = async (
  chainName: AxelarChain,
  gmp: {
    chain: Chain<{ chainId: string }>;
    fee: NatValue;
    axelarIds: AxelarId;
  },
  lca: LocalAccount,
  ctx: PortfolioInstanceContext,
  pk: GuestInterface<PortfolioKit>,
) => {
  const found = pk.manager.reserveAccount(chainName);
  if (found) {
    return found as unknown as Promise<GMPAccountInfo>; // XXX Guest/Host #9822
  }

  const axelarId = gmp.axelarIds[chainName];
  const target = { axelarId, remoteAddress: ctx.contracts[chainName].factory };
  const fee = { denom: ctx.gmpFeeInfo.denom, value: gmp.fee };
  await sendGMPContractCall(target, [], fee, lca, gmp.chain);

  return pk.reader.getGMPInfo(chainName) as unknown as Promise<GMPAccountInfo>; // XXX Guest/Host #9822
};

type TokenMessengerI = {
  depositForBurn: ['uint256', 'uint32', 'bytes32', 'address'];
};

/**
 * @see {@link https://github.com/circlefin/evm-cctp-contracts/blob/master/src/TokenMessenger.sol}
 * 1ddc505 Dec 2022
 */
const TokenMessenger: TokenMessengerI = {
  depositForBurn: ['uint256', 'uint32', 'bytes32', 'address'],
};

/** @see {@link https://developers.circle.com/cctp/supported-domains} */
const nobleDomain = 4;

const bech32ToBytes32 = (addr: Bech32Address) => {
  if (addr === 'cosmos1test') {
    trace('XXX replacing test address to convert to bytes32');
    addr = makeTestAddress(3, 'noble');
  }
  const { data } = fromBech32(addr);
  const dh = encodeHex(data);
  const zeroesNeeded = 64 - dh.length;
  const paddedAddress = '0'.repeat(zeroesNeeded) + dh;
  const bs: `0x${string}` = `0x${paddedAddress}`;
  return bs;
};

export const CCTPfromEVM = {
  how: 'CCTP',
  connections: keys(AxelarChain).map((src: AxelarChain) => ({
    src,
    dest: 'noble',
  })),
  apply: async (ctx, amount, src, dest) => {
    const { addresses: a, lca, gmpChain, gmpFee } = ctx;
    const { chainName, remoteAddress } = src;
    const mintRecipient = bech32ToBytes32(dest.ica.getAddress().value);

    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const tm = session.makeContract(a.tokenMessenger, TokenMessenger);
    usdc.approve(a.tokenMessenger, amount.value);
    tm.depositForBurn(amount.value, nobleDomain, mintRecipient, a.usdc);
    const calls = session.finish();

    const axelarId = ctx.axelarIds[chainName];
    const target = { axelarId, remoteAddress };

    await sendGMPContractCall(target, calls, gmpFee, lca, gmpChain);
  },
  recover: async (_ctx, amount, src, dest) => {
    return CCTP.apply(null, amount, dest, src);
  },
} as const satisfies TransportDetail<
  'CCTP',
  AxelarChain,
  'noble',
  EVMContext<'tokenMessenger'>
>;
harden(CCTPfromEVM);

export const CCTP = {
  how: 'CCTP',
  connections: keys(AxelarChain).map((dest: AxelarChain) => ({
    src: 'noble',
    dest,
  })),
  apply: async (_ctx, amount, src, dest) => {
    const denomAmount: DenomAmount = { denom: 'uusdc', value: amount.value };
    const { chainId, remoteAddress } = dest;
    const destinationAddress: AccountId = `${chainId}:${remoteAddress}`;
    trace(`CCTP destinationAddress: ${destinationAddress}`);
    const { ica } = src;
    await ica.depositForBurn(destinationAddress, denomAmount);
  },
  recover: async (_ctx, amount, src, dest) => {
    // XXX evmCtx needs a GMP fee
    // return CCTPfromEVM.apply(evmCtx, amount, dest, src);
    throw Error('TODO(Luqi): how to recover from CCTP transfer?');
  },
} as const satisfies TransportDetail<'CCTP', 'noble', AxelarChain>;
harden(CCTP);

export const sendGMPContractCall = async (
  dest: { axelarId: string; remoteAddress: EVMT['address'] },
  calls: ContractCall[],
  fee: DenomAmount,
  lca: LocalAccount,
  gmpChain: Chain<{ chainId: string }>,
) => {
  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: dest.axelarId,
    destination_address: dest.remoteAddress,
    payload: buildGMPPayload(calls),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();
  const gmp = { chainId, value: AXELAR_GMP, encoding: 'bech32' as const };
  await lca.transfer(gmp, fee, { memo: JSON.stringify(memo) });
};

export type EVMContext<CN extends string> = {
  lca: LocalAccount;
  gmpFee: DenomAmount;
  gmpChain: Chain<{ chainId: string }>;
  addresses: Record<CN | 'usdc', EVMT['address']>;
  axelarIds: AxelarId;
};

type AaveI = {
  supply: ['address', 'uint256', 'address', 'uint16'];
  withdraw: ['address', 'uint256', 'address'];
};

const Aave: AaveI = {
  supply: ['address', 'uint256', 'address', 'uint16'],
  withdraw: ['address', 'uint256', 'address'],
};

export const AaveProtocol = {
  protocol: 'Aave',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src) => {
    const { remoteAddress } = src;
    const { addresses: a, lca, gmpChain, gmpFee } = ctx;

    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const aave = session.makeContract(a.aavePool, Aave);
    usdc.approve(a.aavePool, amount.value);
    aave.supply(a.usdc, amount.value, remoteAddress, 0);
    const calls = session.finish();

    const axelarId = ctx.axelarIds[src.chainName];
    const target = { axelarId, remoteAddress };
    await sendGMPContractCall(target, calls, gmpFee, lca, gmpChain);
  },
  withdraw: async (ctx, amount, dest) => {
    const { remoteAddress } = dest;
    const { addresses: a, lca, gmpChain, gmpFee } = ctx;

    const session = makeEVMSession();
    const aave = session.makeContract(a.aavePool, Aave);
    aave.withdraw(a.usdc, amount.value, remoteAddress);
    const calls = session.finish();

    const axelarId = ctx.axelarIds[dest.chainName];
    const target = { axelarId, remoteAddress };
    await sendGMPContractCall(target, calls, gmpFee, lca, gmpChain);
  },
} as const satisfies ProtocolDetail<
  'Aave',
  AxelarChain,
  EVMContext<'aavePool'>
>;

type CompoundI = {
  supply: ['address', 'uint256'];
  withdraw: ['address', 'uint256'];
};

const Compound: CompoundI = {
  supply: ['address', 'uint256'],
  withdraw: ['address', 'uint256'],
};

export const CompoundProtocol = {
  protocol: 'Compound',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src) => {
    const { addresses: a, lca, gmpChain, gmpFee: fee } = ctx;
    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const compound = session.makeContract(a.compound, Compound);
    usdc.approve(a.compound, amount.value);
    compound.supply(a.usdc, amount.value);
    const calls = session.finish();

    const { chainName, remoteAddress } = src;
    const axelarId = ctx.axelarIds[chainName];
    const target = { axelarId, remoteAddress };
    await sendGMPContractCall(target, calls, fee, lca, gmpChain);
  },
  withdraw: async (ctx, amount, dest) => {
    const { addresses: a, lca, gmpChain, gmpFee: fee } = ctx;
    const session = makeEVMSession();
    const compound = session.makeContract(a.compound, Compound);
    compound.withdraw(a.usdc, amount.value);
    const calls = session.finish();

    const { chainName, remoteAddress } = dest;
    const axelarId = ctx.axelarIds[chainName];
    const target = { axelarId, remoteAddress };
    await sendGMPContractCall(target, calls, fee, lca, gmpChain);
  },
} as const satisfies ProtocolDetail<
  'Compound',
  AxelarChain,
  EVMContext<'compound'>
>;
