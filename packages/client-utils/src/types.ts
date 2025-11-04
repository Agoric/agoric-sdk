// @file types for the client-utils package
// NB: this doesn't follow best practices for TS in JS because this package will likely soon be written in TS

import type { Brand, Issuer } from '@agoric/ertp';
import type {
  ContractRecord,
  FeeConfig,
  PoolMetrics,
  TransactionRecord,
} from '@agoric/fast-usdc';
import type {
  OutcomeRecord,
  QuestionDetails,
} from '@agoric/governance/src/types.js';
import type { BookDataNotification } from '@agoric/inter-protocol/src/auction/auctionBook.js';
import type { AuctionParamRecord } from '@agoric/inter-protocol/src/auction/params.js';
import type { ScheduleNotification } from '@agoric/inter-protocol/src/auction/scheduler.js';
import type { MetricsNotification as VaultDirectorMetrics } from '@agoric/inter-protocol/src/vaultFactory/vaultDirector.js';
import type {
  CurrentWalletRecord,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.js';
import type {
  Installation,
  Instance,
} from '@agoric/zoe/src/zoeService/types.js';

/**
 * ClusterName specifies a collection of networks.
 * The specific networks associated with a particular name may vary from context
 * to context, and may also overlap (e.g. a "local" cluster may connect to the
 * same remote networks as a "testnet" cluster), but this type nevertheless
 * supports cross-package coordination where the values associated with static
 * labels are subject to choice of cluster. Some examples:
 *   - the chain ID for a static label like "Agoric" or "Ethereum"
 *   - the cryptographic hash for a static label like "BLD" or "USDC"
 *   - the URL for a service like "Agoric RPC" or "Axelar" or "Spectrum"
 *
 * "mainnet" should always include the Agoric network described by
 * https://main.agoric.net/network-config rather than some other alternative.
 */
export type ClusterName = 'local' | 'testnet' | 'mainnet';

// For static string key types. String template matching has to be in the ternary below.
type PublishedTypeMap = {
  'auction.governance': { current: AuctionParamRecord };
  'auction.schedule': ScheduleNotification;
  'vaultFactory.metrics': VaultDirectorMetrics;
  'agoricNames.installation': Array<[string, Installation]>;
  'agoricNames.instance': Array<[string, Instance]>;
  'agoricNames.brand': Array<[string, Brand]>;
  'agoricNames.issuer': Array<[string, Issuer]>;
  'agoricNames.vbankAsset': Array<[string, AssetInfo]>;
  fastUsdc: ContractRecord;
  'fastUsdc.feeConfig': FeeConfig;
  'fastUsdc.poolMetrics': PoolMetrics;
  ymax0: StatusFor['contract'];
  ymax1: StatusFor['contract'];
  'ymax0.portfolios': StatusFor['portfolios'];
  'ymax1.portfolios': StatusFor['portfolios'];
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
      : T extends `ymax${'0' | '1'}.portfolios.portfolio${number}`
        ? StatusFor['portfolio']
        : T extends `ymax${'0' | '1'}.portfolios.portfolio${number}.positions.${string}`
          ? StatusFor['position']
          : T extends `ymax${'0' | '1'}.portfolios.portfolio${number}.pendingTx.tx${number}`
            ? StatusFor['pendingTx']
            : T extends `ymax${'0' | '1'}.portfolios.portfolio${number}.flows.flow${number}`
              ? StatusFor['flow']
              : T extends `ymax${'0' | '1'}.portfolios.portfolio${number}.flows.flow${number}.steps`
                ? StatusFor['flowSteps']
                : T extends `committees.${string}.latestQuestion`
                  ? QuestionDetails
                  : T extends `committees.${string}.latestOutcome`
                    ? OutcomeRecord
                    : T extends `vaultFactory.managers.manager${number}.metrics`
                      ? VaultDirectorMetrics
                      : T extends `fastUsdc.txns.${string}`
                        ? TransactionRecord
                        : T extends `auction.book${number}`
                          ? BookDataNotification
                          : unknown;
// static string keys are defined in PublishedTypeMap
