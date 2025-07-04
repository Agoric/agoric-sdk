import type { HostInterface } from '@agoric/async-flow';
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
import {
  buildMsgResponseString,
  buildTxPacketString,
} from '@agoric/orchestration/tools/ibc-mocks.ts';
import type { VowTools } from '@agoric/vow';
import type { AmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { Zone } from '@agoric/zone';
import { makePromiseKit } from '@endo/promise-kit';
import type { EVMContractAddresses } from '../src/type-guards';

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
  money = `${3333 * 1000000}`,
) => ({
  swap: {
    msg: buildTxPacketString([
      MsgSwap.toProtoMsg({
        signer,
        amount: { denom: 'uusdc', amount: money },
        routes: [{ poolId: 0n, denomTo: 'uusdn' }],
        min: { denom: 'uusdn', amount: money },
      }),
    ]),
    ack: buildMsgResponseString(MsgSwapResponse, {}),
  },
  lock: {
    msg: buildTxPacketString([
      MsgLock.toProtoMsg({ signer, vault: 1, amount: money }),
    ]),
    ack: buildMsgResponseString(MsgLockResponse, {}),
  },
  lockWorkaround: {
    // XXX { ..., vault: 1n } ???
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xvS0ZpOXViMkpzWlM1emQyRndMbll4TGsxeloxTjNZWEFTUUFvTFkyOXpiVzl6TVhSbGMzUVNFd29GZFhWelpHTVNDak16TXpNd01EQXdNREFhQnhJRmRYVnpaRzRpRXdvRmRYVnpaRzRTQ2pNek16TXdNREF3TURBS1Bnb2ZMMjV2WW14bExtUnZiR3hoY2k1MllYVnNkSE11ZGpFdVRYTm5URzlqYXhJYkNndGpiM050YjNNeGRHVnpkQkFCR2dvek16TXpNREF3TURBdyIsIm1lbW8iOiIifQ==',
    ack: buildMsgResponseString(MsgLockResponse, {}),
  },
});

export const contractAddressesMock: EVMContractAddresses = {
  Ethereum: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'ethereum-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  Avalanche: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  optimism: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'optimism-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  arbitrum: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'arbitrum-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  Polygon: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'polygon-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  Fantom: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  binance: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
} as const;

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
