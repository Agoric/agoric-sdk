/* eslint-disable no-undef */
/// <reference types="@agoric/zoe" />

type Collateral = {
  liquidationMargin: Ratio;
  stabilityFee: Ratio;
  marketPrice: Ratio;
  interestRate: Ratio;
  brand: Brand;
};

type VaultFactory = {
  addVaultType: AddVaultType;
  getCollaterals: () => Promise<Array<Collateral>>;
  getRewardAllocation: () => Allocation;
  getBootstrapPayment: () => Promise<Payment>;
  getContractGovernor: () => Instance;
  makeCollectFeesInvitation: () => Promise<Invitation>;
};
