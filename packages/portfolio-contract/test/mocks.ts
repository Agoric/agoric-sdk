import type { HostInterface } from '@agoric/async-flow';
import {
  MsgDepositForBurn,
  MsgDepositForBurnResponse,
} from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import {
  MsgTransfer,
  MsgTransferResponse,
} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import {
  MsgLock,
  MsgLockResponse,
} from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import {
  MsgSwap,
  MsgSwapResponse,
} from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import type { Brand, Issuer, Payment } from '@agoric/ertp';
import { makeRatio } from '@agoric/ertp/src/ratio.js';
import type { FeeConfig, LogFn } from '@agoric/fast-usdc/src/types.js';
import type {
  CosmosChainAddress,
  DenomAmount,
  OrchestrationAccount,
} from '@agoric/orchestration';
import { leftPadEthAddressTo32Bytes } from '@agoric/orchestration/src/utils/address.js';
import {
  buildTxPacketString,
  buildTxResponseString,
} from '@agoric/orchestration/tools/ibc-mocks.ts';
import type { VowTools } from '@agoric/vow';
import type { AmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { Zone } from '@agoric/zone';
import { makePromiseKit } from '@endo/promise-kit';
import type { AxelarId, GmpAddresses } from '../src/portfolio.contract.ts';
import type { EVMContractAddressesMap } from '../src/type-guards.ts';
import type { AxelarChain } from '../src/constants.js';

export const localAccount0 = 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht';

export const prepareMockOrchAccounts = (
  zone: Zone,
  {
    vowTools: { asVow },
    log,
    usdc,
  }: {
    vowTools: VowTools;
    log: (...args: any[]) => void;
    usdc: { brand: Brand<'nat'>; issuer: Issuer<'nat'> };
  },
) => {
  // each can only be resolved/rejected once per test
  const poolAccountSendPK = makePromiseKit<void>();
  const poolAccountTransferPK = makePromiseKit<void>();
  const settleAccountTransferPK = makePromiseKit<void>();
  const settleAccountSendPK = makePromiseKit<void>();
  const intermediateAccountTransferPK = makePromiseKit<void>();
  const intermediateAccountDepositForBurnPK = makePromiseKit<void>();

  const mockedPoolAccount = zone.exo('Mock Pool LocalOrchAccount', undefined, {
    transfer(destination: CosmosChainAddress, amount: DenomAmount) {
      log('PoolAccount.transfer() called with', destination, amount);
      return poolAccountTransferPK.promise;
    },
    deposit(payment: Payment<'nat'>) {
      log('PoolAccount.deposit() called with', payment);
      // XXX consider a mock for deposit failure
      return asVow(async () => usdc.issuer.getAmountOf(payment));
    },
    send(destination: CosmosChainAddress, amount: DenomAmount) {
      log('PoolAccount.send() called with', destination, amount);
      return poolAccountSendPK.promise;
    },
  });

  const poolAccount = mockedPoolAccount as unknown as HostInterface<
    OrchestrationAccount<{ chainId: 'agoric-any' }>
  >;

  const settlementCallLog = [] as any[];
  const settlementAccountMock = zone.exo('Mock Settlement Account', undefined, {
    transfer(...args) {
      settlementCallLog.push(harden(['transfer', ...args]));
      return settleAccountTransferPK.promise;
    },
    send(...args) {
      settlementCallLog.push(harden(['send', ...args]));
      return settleAccountSendPK.promise;
    },
  });
  const settlementAccount = settlementAccountMock as unknown as HostInterface<
    OrchestrationAccount<{ chainId: 'agoric-any' }>
  >;
  const intermediateCallLog = [] as any[];
  const intermediateAccountMock = zone.exo('Mock Noble ICA', undefined, {
    getAddress(): CosmosChainAddress {
      return {
        chainId: 'noble-1',
        encoding: 'bech32',
        value: 'noble1test',
      };
    },
    transfer(...args) {
      intermediateCallLog.push(harden(['transfer', ...args]));
      return intermediateAccountTransferPK.promise;
    },
    depositForBurn(...args) {
      intermediateCallLog.push(harden(['depositForBurn', ...args]));
      return intermediateAccountDepositForBurnPK.promise;
    },
  });
  const intermediateAccount =
    intermediateAccountMock as unknown as HostInterface<
      OrchestrationAccount<{ chainId: 'noble-any' }>
    >;
  return {
    // These each have VResolver for "vow" resolver. The mocks actually
    // deal in promises but the flow that awaits them expects that it's actually
    // awaiting a vow (made by the membrane to look like a promise).
    mockPoolAccount: {
      account: poolAccount,
      transferVResolver: poolAccountTransferPK,
      sendVResolver: poolAccountSendPK,
    },
    settlement: {
      account: settlementAccount,
      callLog: settlementCallLog,
      transferVResolver: settleAccountTransferPK,
      sendVResolver: settleAccountSendPK,
    },
    intermediate: {
      account: intermediateAccount,
      callLog: intermediateCallLog,
      transferVResolver: intermediateAccountTransferPK,
      depositForBurnVResolver: intermediateAccountDepositForBurnPK,
    },
  };
};

export const makeTestLogger = (logger: LogFn) => {
  const logs: unknown[][] = [];
  const log = (...args: any[]) => {
    logs.push(args);
    logger(args);
  };
  const inspectLogs = (index?: number) =>
    typeof index === 'number' ? logs[index] : logs;
  return { log, inspectLogs };
};
export type TestLogger = ReturnType<typeof makeTestLogger>;

export const makeTestFeeConfig = (usdc: Omit<AmountUtils, 'mint'>): FeeConfig =>
  harden({
    flat: usdc.make(1n),
    variableRate: makeRatio(2n, usdc.brand),
    contractRate: makeRatio(20n, usdc.brand),
  });

export const makeUSDNIBCTraffic = (
  signer = 'cosmos1test',
  money = `${3_333.33 * 1000000}`,
  { denom = 'uusdc', denomTo = 'uusdn' } = {},
) => ({
  swapIn: {
    msg: buildTxPacketString([
      MsgSwap.toProtoMsg({
        signer,
        amount: { denom, amount: money },
        routes: [{ poolId: 0n, denomTo }],
        min: { denom: denomTo, amount: money },
      }),
    ]),
    ack: buildTxResponseString([{ encoder: MsgSwapResponse, message: {} }]),
  },
  swapOut: {
    msg: buildTxPacketString([
      MsgSwap.toProtoMsg({
        signer,
        amount: { denom: denomTo, amount: money },
        routes: [{ poolId: 0n, denomTo: denom }],
        min: { denom, amount: money },
      }),
    ]),
    ack: buildTxResponseString([{ encoder: MsgSwapResponse, message: {} }]),
  },
  swapLock: {
    msg: buildTxPacketString([
      MsgSwap.toProtoMsg({
        signer,
        amount: { denom, amount: money },
        routes: [{ poolId: 0n, denomTo }],
        min: { denom: denomTo, amount: money },
      }),
      MsgLock.toProtoMsg({ signer, vault: 1, amount: money }),
    ]),
    ack: buildTxResponseString([
      { encoder: MsgSwapResponse, message: {} },
      { encoder: MsgLockResponse, message: {} },
    ]),
  },
  transferBackFromNoble: {
    msg: buildTxPacketString([
      MsgTransfer.toProtoMsg({
        sourcePort: 'transfer',
        sourceChannel: 'channel-21',
        token: { denom: 'uusdc', amount: money },
        sender: signer,
        receiver: 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
        timeoutHeight: { revisionHeight: 0n, revisionNumber: 0n },
        timeoutTimestamp: 300000000000n,
        memo: '',
      }),
    ]),
    ack: buildTxResponseString([{ encoder: MsgTransferResponse, message: {} }]),
  },
});

export const makeCCTPTraffic = (
  from = 'cosmos1test',
  money = `${3_333.33 * 1000000}`,
  dest = '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
) => ({
  depositForBurn: {
    msg: buildTxPacketString([
      MsgDepositForBurn.toProtoMsg({
        amount: money,
        burnToken: 'uusdc',
        destinationDomain: 3,
        from,
        mintRecipient: leftPadEthAddressTo32Bytes(dest),
      }),
    ]),

    ack: buildTxResponseString([
      { encoder: MsgDepositForBurnResponse, message: {} },
    ]),
  },
  depositForBurnx2: {
    msg: buildTxPacketString([
      MsgDepositForBurn.toProtoMsg({
        amount: `${6_666.67 * 1000000}`,
        burnToken: 'uusdc',
        destinationDomain: 3,
        from,
        mintRecipient: leftPadEthAddressTo32Bytes(dest),
      }),
    ]),

    ack: buildTxResponseString([
      { encoder: MsgDepositForBurnResponse, message: {} },
    ]),
  },
});

/** https://developers.circle.com/cctp/evm-smart-contracts#tokenmessenger-testnet */
const testnetTokenMessenger = (rows =>
  Object.fromEntries(
    rows.map(([Chain, Domain, Address]) => [Chain, { Domain, Address }]),
  ))([
  ['Ethereum Sepolia', 0, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
  ['Avalanche Fuji', 1, '0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0'],
  ['OP Sepolia', 2, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
  ['Arbitrum Sepolia', 3, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
  ['Base Sepolia', 6, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
  ['Polygon PoS Amoy', 7, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
  ['Unichain Sepolia', 10, '0x8ed94B8dAd2Dc5453862ea5e316A8e71AAed9782'],
] as [string, number, `0x${string}`][]);

export const contractsMock: EVMContractAddressesMap = {
  Avalanche: {
    aavePool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compound: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    factory: '0xef8651dD30cF990A1e831224f2E0996023163A81',
    usdc: '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
    tokenMessenger: testnetTokenMessenger['Avalanche Fuji'].Address,
    aaveUSDC: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    aaveRewardsController: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compoundRewardsController: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    Beefy_re7_Avalanche: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  },
  Optimism: {
    aavePool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compound: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    factory: '0xef8651dD30cF990A1e831224f2E0996023163A81',
    usdc: '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
    tokenMessenger: testnetTokenMessenger['OP Sepolia'].Address,
    aaveUSDC: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    aaveRewardsController: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compoundRewardsController: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  },
  Arbitrum: {
    aavePool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compound: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    factory: '0xef8651dD30cF990A1e831224f2E0996023163A81',
    usdc: '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
    tokenMessenger: testnetTokenMessenger['Arbitrum Sepolia'].Address,
    aaveUSDC: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    aaveRewardsController: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compoundRewardsController: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    Beefy_re7_Avalanche: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  },
  Polygon: {
    aavePool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compound: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    factory: '0xef8651dD30cF990A1e831224f2E0996023163A81',
    usdc: '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
    tokenMessenger: testnetTokenMessenger['Polygon PoS Amoy'].Address,
    aaveUSDC: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    aaveRewardsController: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compoundRewardsController: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  },
} as const;

export const axelarIdsMock: AxelarId = {
  Avalanche: 'Avalanche',
  Optimism: 'optimism',
  Arbitrum: 'arbitrum',
  Polygon: 'Polygon',
} as const;

/**
 * Use Arbitrum or any other EVM chain whose Axelar chain ID (`axelarId`) differs
 * from the chain name. For example, Arbitrum's `axelarId` is "arbitrum", while
 * Ethereum’s is "Ethereum" (case-sensitive). The challenge is that if a mismatch
 * occurs, it may go undetected since the `axelarId` is passed via the IBC memo
 * and not validated automatically.
 *
 * To ensure proper testing, it's best to use a chain where the `chainName` and
 * `axelarId` are not identical. This increases the likelihood of catching issues
 * with misconfigured or incorrectly passed `axelarId` values.
 *
 * To see the `axelarId` for a given chain, refer to:
 * @see {@link https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts | supported-chains-list.ts}
 */
export const evmNamingDistinction = {
  destinationEVMChain: 'Arbitrum' as AxelarChain,
  sourceChain: 'arbitrum',
};

/** from https://www.mintscan.io/noble explorer */
export const explored = [
  {
    txhash: '50D671D1D56CF5041CBE7C3483EF461765196ECD7D7571CCEF0A612B46FC7A3B',
    messages: [
      {
        '@type': '/noble.swap.v1.MsgSwap',
        signer: 'noble1wtwydxverrrc673anqddyg3cmq3vhpu7yxy838',
        amount: { denom: 'uusdc', amount: '111000000' },
        // routes: [{ pool_id: '0', denom_to: 'uusdn' }],
        routes: [{ poolId: 0n, denomTo: 'uusdn' }],
        min: { denom: 'uusdn', amount: '110858936' },
      } satisfies MsgSwap & { '@type': string },
    ],
  },
  {
    txhash: 'BD97D42915C9185B11B14FEDC2EF6BCE0677E6720472DC6E1B51CCD504534237',
    messages: [
      {
        '@type': '/noble.dollar.vaults.v1.MsgLock',
        signer: 'noble1wtwydxverrrc673anqddyg3cmq3vhpu7yxy838',
        vault: 1, // 'STAKED',
        amount: '110818936',
      } satisfies MsgLock & { '@type': string },
    ],
  },
];
harden(explored);

export const gmpAddresses: GmpAddresses = harden({
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1aythygn6z5thymj6tmzfwekzh05ewg3l7d6y89',
});
