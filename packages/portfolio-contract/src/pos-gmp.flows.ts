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
import type { GuestInterface } from '@agoric/async-flow';
import type { NatValue } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { encodeHex } from '@agoric/internal/src/hex.js';
import {
  type AccountId,
  type Bech32Address,
  type Chain,
  type DenomAmount,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type ContractCall,
} from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import {
  buildGasPayload,
  buildGMPPayload,
} from '@agoric/orchestration/src/utils/gmp.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  transformResultMeta,
  type MaybeResultMeta,
} from '@agoric/orchestration/src/utils/result-meta.js';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { fromBech32 } from '@cosmjs/encoding';
import { Fail, q, X } from '@endo/errors';
import { ERC20, makeEVMSession, type EVMT } from './evm-facade.ts';
import { generateNobleForwardingAddress } from './noble-fwd-calc.js';
import type {
  AxelarId,
  EVMContractAddresses,
  GmpAddresses,
} from './portfolio.contract.ts';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type LocalAccount,
  type PortfolioInstanceContext,
  type ProtocolDetail,
  type TransportDetail,
} from './portfolio.flows.ts';
import { TxType } from './resolver/constants.js';
import type { ResolverKit } from './resolver/resolver.exo.ts';
import type { PoolKey } from './type-guards.ts';

const trace = makeTracer('GMPF');
const { keys } = Object;

export const provideEVMAccount = async (
  chainName: AxelarChain,
  gmp: {
    chain: Chain<{ chainId: string }>;
    fee: NatValue;
    axelarIds: AxelarId;
    evmGas: bigint;
  },
  lca: LocalAccount,
  ctx: PortfolioInstanceContext,
  pk: GuestInterface<PortfolioKit>,
): Promise<MaybeResultMeta<GMPAccountInfo>> => {
  await null;
  const found = pk.manager.reserveAccount(chainName);
  if (found) {
    return found as unknown as Promise<GMPAccountInfo>; // XXX Guest/Host #9822
  }

  // We have the map entry reserved - use critical section pattern
  try {
    const pId = pk.reader.getPortfolioId();
    const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);
    const axelarId = gmp.axelarIds[chainName];
    const target = {
      axelarId,
      remoteAddress: ctx.contracts[chainName].factory,
    };
    const fee = { denom: ctx.gmpFeeInfo.denom, value: gmp.fee };
    fee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;
    const feeAccount = await ctx.contractAccount;
    const src = feeAccount.getAddress();
    traceChain('send makeAccountCall Axelar fee from', src.value);
    await feeAccount.send(lca.getAddress(), fee);
    return transformResultMeta(
      sendMakeAccountCall(
        target,
        fee,
        lca,
        gmp.chain,
        ctx.gmpAddresses,
        gmp.evmGas,
      ),
      ({ result, meta }) => {
        return {
          result: Promise.resolve(result).then(() =>
            pk.reader.getGMPInfo(chainName),
          ),
          meta,
        };
      },
    );
  } catch (reason) {
    trace('failed to make', chainName, reason);
    pk.manager.releaseAccount(chainName, reason);
    throw reason;
  }
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
  if (addr === 'noble1test') {
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
    dest: 'agoric',
  })),
  apply: async (ctx, amount, src, dest) => {
    const traceTransfer = trace.sub('CCTPin').sub(src.chainName);
    traceTransfer('transfer', amount, 'from', src.remoteAddress);
    const { addresses, nobleForwardingChannel } = ctx;
    const fwdAddr = generateNobleForwardingAddress(
      nobleForwardingChannel,
      dest.lca.getAddress().value,
    );
    traceTransfer('Noble forwarding address', fwdAddr);
    const mintRecipient = bech32ToBytes32(fwdAddr); // XXX we generate bech32 only to go back to bytes

    const session = makeEVMSession();
    const usdc = session.makeContract(addresses.usdc, ERC20);
    const tm = session.makeContract(addresses.tokenMessenger, TokenMessenger);
    usdc.approve(addresses.tokenMessenger, amount.value);
    tm.depositForBurn(amount.value, nobleDomain, mintRecipient, addresses.usdc);
    const calls = session.finish();

    const { result } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_AGORIC,
      coerceAccountId(dest.lca.getAddress()),
      amount.value,
    );

    const { result: contractCallP, meta } = await sendGMPContractCall(
      ctx,
      src,
      calls,
    );
    const doneP = Promise.all([contractCallP, result]).then(() => {
      traceTransfer('transfer complete.');
      return contractCallP;
    });

    return { result: doneP, meta };
  },
} as const satisfies TransportDetail<'CCTP', AxelarChain, 'agoric', EVMContext>;
harden(CCTPfromEVM);

export const CCTP = {
  how: 'CCTP',
  connections: keys(AxelarChain).map((dest: AxelarChain) => ({
    src: 'noble',
    dest,
  })),
  apply: async (ctx: PortfolioInstanceContext, amount, src, dest) => {
    const traceTransfer = trace.sub('CCTPout').sub(dest.chainName);
    const denomAmount: DenomAmount = { denom: 'uusdc', value: amount.value };
    const { chainId, remoteAddress } = dest;
    traceTransfer('transfer', denomAmount, 'to', remoteAddress);
    const destinationAddress: AccountId = `${chainId}:${remoteAddress}`;
    const { ica } = src;

    const { result } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_TO_EVM,
      destinationAddress,
      amount.value,
    );
    await Promise.all([
      ica.depositForBurn(destinationAddress, denomAmount),
      result,
    ]);
    traceTransfer('transfer complete.');
    return {};
  },
} as const satisfies TransportDetail<'CCTP', 'noble', AxelarChain>;
harden(CCTP);

/**
 * Sends a GMP call to create a remote account on an EVM chain.
 *
 * The payload is encoded as a uint256 gas amount, which the factory contract
 * decodes and uses for the return message to Agoric.
 *
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/3e5c4a140bf5e9f1606c72f54815d61231ef1fa5/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L121-L144 Factory.sol (lines 121–144)}
 *
 * The factory contract:
 * 1. Decodes payload as uint256: `uint256 gasAmount = abi.decode(payload, (uint256))`
 * 2. Creates the smart wallet: `createSmartWallet(sourceAddress)`
 * 3. Sends response back to Agoric with the provided gas amount: `_send(..., gasAmount)`
 */
export const sendMakeAccountCall = async (
  dest: { axelarId: string; remoteAddress: EVMT['address'] },
  fee: DenomAmount,
  lca: LocalAccount,
  gmpChain: Chain<{ chainId: string }>,
  gmpAddresses: GmpAddresses,
  evmGas: bigint,
) => {
  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: dest.axelarId,
    destination_address: dest.remoteAddress,
    payload: buildGasPayload(evmGas),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();
  const gmp = { chainId, value: AXELAR_GMP, encoding: 'bech32' as const };
  return lca.transferWithMeta(gmp, fee, { memo: JSON.stringify(memo) });
};

/**
 * Sends a GMP call to execute contract calls on a remote smart wallet.
 *
 * The payload is encoded as CallParams[] which the smart wallet contract
 * decodes and executes via multicall(). The remote wallet is itself a smart contract.
 *
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/3e5c4a140bf5e9f1606c72f54815d61231ef1fa5/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L40-L66 Factory.sol (lines 40–66)}
 *
 * The smart wallet contract:
 * 1. Decodes payload as CallParams[]: `CallParams[] memory calls = abi.decode(payload, (CallParams[]))`
 * 2. Executes each call via multicall: `calls[i].target.call(calls[i].data)`
 */
export const sendGMPContractCall = async (
  ctx: EVMContext,
  gmpAcct: GMPAccountInfo,
  calls: ContractCall[],
) => {
  const {
    lca,
    gmpChain,
    gmpFee: fee,
    gmpAddresses,
    resolverClient,
    axelarIds,
  } = ctx;
  const { chainName, remoteAddress, chainId: gmpChainId } = gmpAcct;
  const axelarId = axelarIds[chainName];

  const { result, txId } = resolverClient.registerTransaction(
    TxType.GMP,
    `${gmpChainId}:${remoteAddress}`,
  );

  const { AXELAR_GMP, AXELAR_GAS } = gmpAddresses;
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: axelarId,
    destination_address: remoteAddress,
    payload: buildGMPPayload(calls, txId),
    type: AxelarGMPMessageType.ContractCall,
    fee: { amount: String(fee.value), recipient: AXELAR_GAS },
  };
  const { chainId } = await gmpChain.getChainInfo();
  const gmp = {
    chainId,
    value: AXELAR_GMP,
    encoding: 'bech32' as const,
  };
  await ctx.feeAccount.send(lca.getAddress(), fee);
  return transformResultMeta(
    lca.transferWithMeta(gmp, fee, {
      memo: JSON.stringify(memo),
    }),
    async ({ result: transferDoneP, meta }) => ({
      result: Promise.all([result, transferDoneP]).then(() => ({})),
      meta,
    }),
  );
};

export type EVMContext = {
  feeAccount: LocalAccount;
  lca: LocalAccount;
  gmpFee: DenomAmount;
  gmpChain: Chain<{ chainId: string }>;
  addresses: EVMContractAddresses;
  gmpAddresses: GmpAddresses;
  axelarIds: AxelarId;
  poolKey?: PoolKey;
  resolverClient: GuestInterface<ResolverKit['client']>;
  nobleForwardingChannel: `channel-${number}`;
};

type AaveI = {
  supply: ['address', 'uint256', 'address', 'uint16'];
  withdraw: ['address', 'uint256', 'address'];
};

const Aave: AaveI = {
  supply: ['address', 'uint256', 'address', 'uint16'],
  withdraw: ['address', 'uint256', 'address'],
};

/**
 * see {@link https://github.com/aave/aave-v3-periphery/blob/master/contracts/rewards/RewardsController.sol }
 * 8f3380d Aug 2023
 */
type AaveRewardsControllerI = {
  claimAllRewardsToSelf: ['address[]'];
};

const AaveRewardsController: AaveRewardsControllerI = {
  claimAllRewardsToSelf: ['address[]'],
};

export const AaveProtocol = {
  protocol: 'Aave',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src) => {
    const { remoteAddress } = src;
    const { addresses: a } = ctx;

    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const aave = session.makeContract(a.aavePool, Aave);
    usdc.approve(a.aavePool, amount.value);
    aave.supply(a.usdc, amount.value, remoteAddress, 0);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls);
  },
  withdraw: async (ctx, amount, dest, claim) => {
    const { remoteAddress } = dest;
    const { addresses: a } = ctx;

    const session = makeEVMSession();
    if (claim) {
      const aaveRewardsController = session.makeContract(
        a.aaveRewardsController,
        AaveRewardsController,
      );
      aaveRewardsController.claimAllRewardsToSelf([a.aaveUSDC]);
    }
    const aave = session.makeContract(a.aavePool, Aave);
    aave.withdraw(a.usdc, amount.value, remoteAddress);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls);
  },
} as const satisfies ProtocolDetail<'Aave', AxelarChain, EVMContext>;

type CompoundI = {
  supply: ['address', 'uint256'];
  withdraw: ['address', 'uint256'];
};

const Compound: CompoundI = {
  supply: ['address', 'uint256'],
  withdraw: ['address', 'uint256'],
};

/**
 * see {@link https://github.com/compound-finance/comet/blob/main/contracts/CometRewards.sol }
 * d7b414d May 2023
 */
type CompoundRewardsControllerI = {
  claim: ['address', 'address', 'bool'];
};

const CompoundRewardsController: CompoundRewardsControllerI = {
  claim: ['address', 'address', 'bool'],
};

export const CompoundProtocol = {
  protocol: 'Compound',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src) => {
    const { addresses: a } = ctx;
    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const compound = session.makeContract(a.compound, Compound);
    usdc.approve(a.compound, amount.value);
    compound.supply(a.usdc, amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls);
  },
  withdraw: async (ctx, amount, dest, claim) => {
    const { addresses: a } = ctx;
    const session = makeEVMSession();
    if (claim) {
      const compoundRewardsController = session.makeContract(
        a.compoundRewardsController,
        CompoundRewardsController,
      );
      compoundRewardsController.claim(a.compound, dest.remoteAddress, true);
    }
    const compound = session.makeContract(a.compound, Compound);
    compound.withdraw(a.usdc, amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls);
  },
} as const satisfies ProtocolDetail<'Compound', AxelarChain, EVMContext>;

/**
 * see {@link https://github.com/beefyfinance/beefy-contracts/blob/master/contracts/BIFI/vaults/BeefyVaultV7.sol }
 * 0878a68 Nov 2022
 */
type BeefyVaultI = {
  deposit: ['uint256'];
  withdraw: ['uint256'];
};

const BeefyVault: BeefyVaultI = {
  deposit: ['uint256'],
  withdraw: ['uint256'],
};

export const BeefyProtocol = {
  protocol: 'Beefy',
  chains: keys(AxelarChain) as AxelarChain[],
  supply: async (ctx, amount, src) => {
    const { addresses: a, poolKey } = ctx;
    const session = makeEVMSession();
    const usdc = session.makeContract(a.usdc, ERC20);
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`Beefy pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, BeefyVault);
    usdc.approve(vaultAddress, amount.value);
    vault.deposit(amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, src, calls);
  },
  withdraw: async (ctx, amount, dest) => {
    const { addresses: a, poolKey } = ctx;
    const session = makeEVMSession();
    const vaultAddress =
      a[poolKey] ||
      assert.fail(X`Beefy pool key ${q(poolKey)} not found in addresses`);
    const vault = session.makeContract(vaultAddress, BeefyVault);
    vault.withdraw(amount.value);
    const calls = session.finish();

    return sendGMPContractCall(ctx, dest, calls);
  },
} as const satisfies ProtocolDetail<
  'Beefy',
  AxelarChain,
  EVMContext & { poolKey: PoolKey }
>;
