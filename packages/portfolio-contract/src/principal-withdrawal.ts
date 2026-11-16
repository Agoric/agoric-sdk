/** Configuration resolution shared by binding and execution. */
import {
  isERC4626MorphoInstrumentId,
  type AssetPlaceRef,
} from '@agoric/portfolio-api';
import { PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import type { EVMContractAddresses } from './portfolio.contract.ts';

/** Use the same protocol registry as wayFromSrcToDest. */
export const getPrincipalWithdrawalProtocol = (
  src: AssetPlaceRef,
):
  | { protocol: 'Aave'; addressKey: 'aavePool' }
  | { protocol: 'Compound'; addressKey: 'compound' }
  | undefined => {
  if (!Object.hasOwn(PoolPlaces, src)) return undefined;
  const { protocol } = PoolPlaces[src as keyof typeof PoolPlaces];
  switch (protocol) {
    case 'Aave':
      return { protocol, addressKey: 'aavePool' as const };
    case 'Compound':
      return { protocol, addressKey: 'compound' as const };
    default:
      return undefined;
  }
};
harden(getPrincipalWithdrawalProtocol);

export const hasMinimumRedemptionContracts = (
  src: AssetPlaceRef,
  contracts: EVMContractAddresses | undefined,
): boolean => {
  if (!contracts || !Object.hasOwn(PoolPlaces, src)) return false;
  const { protocol } = PoolPlaces[src as keyof typeof PoolPlaces];
  switch (protocol) {
    case 'ERC4626':
      return !!(
        isERC4626MorphoInstrumentId(src) &&
        contracts.morphoBundler3 &&
        contracts.morphoGeneralAdapter1
      );
    case 'Aave':
      return !!(contracts.aaveUSDC && contracts.universalRouter);
    case 'Compound':
      return !!(contracts.compound && contracts.universalRouter);
    default:
      return false;
  }
};
harden(hasMinimumRedemptionContracts);
