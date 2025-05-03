import type { HostInterface } from '@agoric/async-flow';
import type { Brand, Issuer, Payment } from '@agoric/ertp';
import type {
  CosmosChainAddress,
  DenomAmount,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { VowTools } from '@agoric/vow';
import { makeRatio } from '@agoric/ertp/src/ratio.js';
import type { AmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { Zone } from '@agoric/zone';
import type { FeeConfig, LogFn } from '@agoric/fast-usdc/src/types.js';
import { makePromiseKit } from '@endo/promise-kit';

export const prepareMockOrchAccounts = (
  zone: Zone,
  {
    vowTools: { makeVowKit: _, asVow },
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
