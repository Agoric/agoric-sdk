import type {
  ChainAddress,
  DenomAmount,
  DenomArg,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import type { VowTools } from '@agoric/vow';
import type { HostInterface } from '@agoric/async-flow';
import type { LocalOrchestrationAccountKit } from '@agoric/orchestration/src/exos/local-orchestration-account.js';
import type { LogFn } from '../src/types.js';

export const prepareMockOrchAccounts = (
  zone: Zone,
  {
    vowTools: { makeVowKit },
    log,
  }: { vowTools: VowTools; log: (...args: any[]) => void },
) => {
  // each can only be resolved/rejected once per test
  const poolAccountTransferVK = makeVowKit<undefined>();
  const poolAccountGetBalanceVK = makeVowKit<DenomAmount>();

  const mockedPoolAccount = zone.exo('Pool LocalOrchAccount', undefined, {
    transfer(destination: ChainAddress, amount: DenomAmount) {
      log('PoolAccount.transfer() called with', destination, amount);
      return poolAccountTransferVK.vow;
    },
    getBalance(denomArg: DenomArg) {
      log('PoolAccount.getBalance() called with', denomArg);
      return poolAccountGetBalanceVK.vow;
    },
  });

  const poolAccount = mockedPoolAccount as unknown as HostInterface<
    OrchestrationAccount<{
      chainId: 'agoric';
    }>
  >;

  return {
    pool: {
      account: poolAccount,
      transferVResolver: poolAccountTransferVK.resolver,
      getBalanceVResolver: poolAccountGetBalanceVK.resolver,
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
