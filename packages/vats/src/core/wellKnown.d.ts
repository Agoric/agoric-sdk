/**
 * @file Type exports for WellKnown names. TS so it doesn't affect runtime dependency graph.
 */
// 'start' fns
import type { start as amm } from '@agoric/inter-protocol/src/vpool-xyk-amm/multipoolMarketMaker.js';
import type { start as binaryVoteCounter } from '@agoric/governance/src/binaryVoteCounter.js';
import type { start as committee } from '@agoric/governance/src/committee.js';
import type { start as contractGovernor } from '@agoric/governance/src/contractGovernor.js';
import type { start as econCommitteeCharter } from '@agoric/inter-protocol/src/econCommitteeCharter.js';
import type { start as feeDistributor } from '@agoric/inter-protocol/src/feeDistributor.js';
import type { start as interchainPool } from '@agoric/inter-protocol/src/interchainPool.js';
import type { start as liquidate } from '@agoric/inter-protocol/src/vaultFactory/liquidateIncrementally.js';
import type { start as noActionElectorate } from '@agoric/governance/src/noActionElectorate.js';
import type { start as priceAggregator } from '@agoric/inter-protocol/src/price/fluxAggregator.contract.js';
import type { start as psm } from '@agoric/inter-protocol/src/psm/psm.js';
import type { start as reserve } from '@agoric/inter-protocol/src/reserve/assetReserve.js';
import type { start as stakeFactory } from '@agoric/inter-protocol/src/stakeFactory/stakeFactory.js';
import type { start as VaultFactory } from '@agoric/inter-protocol/src/vaultFactory/vaultFactory.js';
import type { start as walletFactory } from '@agoric/smart-wallet/src/walletFactory.js';
import type { start as Pegasus } from '@agoric/pegasus/src/pegasus.js';
import type { start as provisionPool } from '../provisionPool.js';
import type { start as centralSupply } from '../centralSupply.js';

// 'prepare' fns
import type { prepare as mintHolder } from '../mintHolder.js';

const contractFns = {
  amm,
  binaryVoteCounter,
  centralSupply,
  committee,
  contractGovernor,
  econCommitteeCharter,
  feeDistributor,
  interchainPool,
  liquidate,
  mintHolder,
  noActionElectorate,
  Pegasus,
  priceAggregator,
  provisionPool,
  psm,
  reserve,
  stakeFactory,
  VaultFactory,
  walletFactory,
};

export type WellKnownInstallations = {
  [K in keyof typeof contractFns]: Installation<(typeof contractFns)[K]>;
};
