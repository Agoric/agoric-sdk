import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { CaipChainId } from '@agoric/orchestration';
import type { PlanObservations } from '@agoric/portfolio-api';
import type { ComputeTargetBalancesOptions } from '@agoric/portfolio-api/src/target-balances.js';

/** cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/api-schemas.ts: Instrument */
export type YdsInstrument = {
  id: AssetPlaceRef;
  caipChainId: CaipChainId;
  tvl?: number;
  totalSupplyUsd?: number;
  supplyUtilizationRatio?: number;
  liquidityUsd?: number;
};

export type InstrumentBlocks = Required<
  ComputeTargetBalancesOptions<any, any>
>['instrumentBlocks'];

export type InstrumentSnapshot = {
  blocks?: InstrumentBlocks;
  tvls: PlanObservations['instrumentTvls'];
};

export const extractInstrumentTvls = (
  instruments: YdsInstrument[],
): PlanObservations['instrumentTvls'] =>
  Object.fromEntries(
    instruments.flatMap(({ id, tvl }) =>
      tvl !== undefined && Number.isFinite(tvl) && tvl >= 0
        ? [[id, { tvlUsd: BigInt(Math.round(tvl)) }]]
        : [],
    ),
  );

export const calculateInstrumentBlocks = (
  instruments: YdsInstrument[],
): InstrumentBlocks => {
  const noDepositInstruments = new Set<AssetPlaceRef>();
  const noWithdrawInstruments = new Set<AssetPlaceRef>();
  for (const instrument of instruments) {
    const { id, totalSupplyUsd, liquidityUsd } = instrument;
    if (totalSupplyUsd === undefined || liquidityUsd === undefined) continue;

    if (liquidityUsd < 1000 && liquidityUsd < 0.05 * totalSupplyUsd) {
      // Where liquidity is critically low in both absolute terms (< $1k) and
      // relative terms (< 5% of total supply), block withdrawals (and for
      // consistency, also deposits).
      noWithdrawInstruments.add(id);
      noDepositInstruments.add(id);
    } else if (liquidityUsd < 10_000) {
      // Where liquidity is dangerously low in absolute terms (< $10k), block
      // deposits while still allowing withdrawals.
      noDepositInstruments.add(id);
    }
  }
  return { noDepositInstruments, noWithdrawInstruments };
};
