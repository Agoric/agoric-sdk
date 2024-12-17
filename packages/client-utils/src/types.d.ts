// @file types for the client-utils package
// NB: this doesn't follow best practices for TS in JS because this package will likely soon be written in TS

import type {
  OutcomeRecord,
  QuestionDetails,
} from '@agoric/governance/src/types.js';
import type { MetricsNotification as VaultManagerMetrics } from '@agoric/inter-protocol/src/vaultFactory/vaultManager.js';
import type {
  CurrentWalletRecord,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { ContractRecord, PoolMetrics } from '@agoric/fast-usdc';

// For static string key types. String template matching has to be in the ternary below.
type PublishedTypeMap = {
  'auction.governance': { current: AuctionParamRecord };
  'auction.schedule': ScheduleNotification;
  'vaultFactory.metrics': { rewardPoolAllocation: RewardPoolAllocationRecord };
};

/**
 * Utility type to the type that would result from unmarshalling the latest
 * value at a vstorage `published` path.
 */
export type TypedPublished<T extends string> = T extends keyof PublishedTypeMap
  ? PublishedTypeMap[T]
  : T extends `wallet.${string}.current`
    ? CurrentWalletRecord
    : T extends `wallet.${string}`
      ? UpdateRecord
      : T extends `committees.${string}.latestQuestion`
        ? QuestionDetails
        : T extends `committees.${string}.latestOutcome`
          ? OutcomeRecord
          : T extends `vaultFactory.managers.manager${number}.metrics`
            ? VaultManagerMetrics
            : T extends 'agoricNames.instance'
              ? Array<[string, Instance]>
              : T extends 'agoricNames.brand'
                ? Array<[string, Brand]>
                : T extends 'fastUsdc'
                  ? ContractRecord
                  : T extends 'fastUsdc.poolMetrics'
                    ? PoolMetrics
                    : unknown;
