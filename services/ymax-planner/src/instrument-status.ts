import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { CaipChainId } from '@agoric/orchestration';
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

export const calculateInstrumentBlocks = (
  instruments: YdsInstrument[],
): InstrumentBlocks => {
  const noDepositInstruments = new Set<AssetPlaceRef>();
  const noWithdrawInstruments = new Set<AssetPlaceRef>();
  for (const instrument of instruments) {
    const { id, totalSupplyUsd, liquidityUsd } = instrument;
    if (totalSupplyUsd === undefined || liquidityUsd === undefined) continue;

    // Block deposits if liquidity < $10k or liquidity < 10% of total supply.
    if (liquidityUsd < 10_000 || liquidityUsd < 0.1 * totalSupplyUsd) {
      noDepositInstruments.add(id);
    }

    // Block withdrawals if liquidity < $1k and liquidity < 5% of total supply.
    if (liquidityUsd < 1000 && liquidityUsd < 0.05 * totalSupplyUsd) {
      noWithdrawInstruments.add(id);
    }
  }
  return { noDepositInstruments, noWithdrawInstruments };
};
