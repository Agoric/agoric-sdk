import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

/**
 *
 * @param {VaultId} vaultId
 * @param {Amount} initDebt
 * @param {Amount} initCollateral
 * @returns {VaultKit & {vault: {setDebt: (Amount) => void}}}
 */
export function makeFakeVaultKit(
  vaultId,
  initDebt,
  initCollateral = AmountMath.make(initDebt.brand, 100n),
) {
  let debt = initDebt;
  let collateral = initCollateral;
  const vault = Far('Vault', {
    getCollateralAmount: () => collateral,
    getNormalizedDebt: () => debt,
    getDebtAmount: () => debt,
    setDebt: newDebt => (debt = newDebt),
    setCollateral: newCollateral => (collateral = newCollateral),
  });
  const admin = Far('vaultAdmin', {
    getIdInManager: () => vaultId,
    liquidate: () => {},
  });
  // @ts-expect-error pretend this is compatible with VaultKit
  return harden({
    vault,
    admin,
  });
}
