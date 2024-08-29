import { ParamChangesOfferArgs } from '@agoric/inter-protocol/src/econCommitteeCharter';

export const updateVaultManagerParams = async (t, gd, brand, newDebtLimit) => {
  const { agoricNamesRemotes } = t.context;

  const vaults = agoricNamesRemotes.instance.VaultFactory;
  const timerBrand = agoricNamesRemotes.brand.timer;
  assert(timerBrand);

  /* XXX @type {Partial<VaultsParams>} */
  const params = {
    DebtLimit: { brand: agoricNamesRemotes.brand.IST, value: newDebtLimit },
  };

  const offerArgs: ParamChangesOfferArgs = {
    deadline: 1000n,
    params,
    instance: vaults,
    path: { paramPath: { key: { collateralBrand: brand } } },
  };

  await gd.changeParams(vaults, params, offerArgs.path);

  return newDebtLimit;
};
export const updateVaultDirectorParams = async (t, gd, referenceUI) => {
  const { agoricNamesRemotes } = t.context;

  const vaults = agoricNamesRemotes.instance.VaultFactory;
  const timerBrand = agoricNamesRemotes.brand.timer;
  assert(timerBrand);

  const params = {
    ReferencedUI: referenceUI,
  };

  const offerArgs: ParamChangesOfferArgs = {
    deadline: 1000n,
    params,
    instance: vaults,
    path: { paramPath: { key: 'governedParams' } },
  };

  await gd.changeParams(vaults, params, offerArgs.path);

  return referenceUI;
};
