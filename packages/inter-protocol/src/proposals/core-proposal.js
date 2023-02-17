import { Stable } from '@agoric/vats/src/tokens.js';
import * as econBehaviors from './econ-behaviors.js';
import { ECON_COMMITTEE_MANIFEST } from './startEconCommittee.js';
import * as simBehaviors from './sim-behaviors.js';

export * from './econ-behaviors.js';
export * from './sim-behaviors.js';
// @ts-expect-error Module './econ-behaviors.js' has already exported a member
// named 'EconomyBootstrapPowers'.
export * from './startPSM.js'; // eslint-disable-line import/export
export * from './startEconCommittee.js'; // eslint-disable-line import/export

/** @type {import('@agoric/vats/src/core/manifest.js').BootstrapManifest} */
const SHARED_MAIN_MANIFEST = harden({
  /** @type {import('@agoric/vats/src/core/manifest.js').BootstrapManifestPermit} */
  [econBehaviors.setupAmm.name]: {
    consume: {
      board: 'board',
      chainStorage: true,
      chainTimerService: 'timer',
      zoe: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: { ammKit: 'amm' },
    issuer: { consume: { [Stable.symbol]: 'zoe' } },
    brand: { consume: { [Stable.symbol]: 'zoe' } },
    installation: {
      consume: { contractGovernor: 'zoe', amm: 'zoe' },
    },
    instance: {
      produce: { ammGovernor: 'ammGovernor' },
    },
  },
  [econBehaviors.startInterchainPool.name]: {
    consume: { bankManager: 'bank', zoe: 'zoe', agoricNamesAdmin: true },
    installation: {
      consume: { interchainPool: 'zoe' },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    issuer: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm' },
      produce: { interchainPool: 'interchainPool' },
    },
  },
  [econBehaviors.startVaultFactory.name]: {
    consume: {
      board: 'board',
      chainStorage: true,
      feeMintAccess: 'zoe',
      chainTimerService: 'timer',
      zoe: 'zoe',
      priceAuthority: 'priceAuthority',
      economicCommitteeCreatorFacet: 'economicCommittee',
      reserveKit: 'reserve',
    },
    produce: { vaultFactoryKit: 'VaultFactory' },
    brand: { consume: { [Stable.symbol]: 'zoe' } },
    oracleBrand: { consume: { USD: true } },
    installation: {
      consume: {
        contractGovernor: 'zoe',
        VaultFactory: 'zoe',
        liquidate: 'zoe',
      },
    },
    instance: {
      consume: {
        amm: 'amm',
        reserve: 'reserve',
      },
      produce: {
        VaultFactory: 'VaultFactory',
        Treasury: 'VaultFactory',
        VaultFactoryGovernor: 'VaultFactoryGovernor',
      },
    },
  },
  [econBehaviors.grantVaultFactoryControl.name]: {
    consume: {
      client: 'provisioning',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryKit: 'VaultFactory',
    },
  },

  [econBehaviors.setupReserve.name]: {
    consume: {
      ammKit: 'amm',
      board: 'board',
      chainStorage: true,
      feeMintAccess: 'zoe',
      chainTimerService: 'timer',
      zoe: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: { reserveKit: 'reserve' },
    issuer: { consume: { [Stable.symbol]: 'zoe' } },
    brand: { consume: { [Stable.symbol]: 'zoe' } },
    installation: {
      consume: { contractGovernor: 'zoe', reserve: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm' },
      produce: {
        amm: 'amm',
        reserve: 'reserve',
        reserveGovernor: 'ReserveGovernor',
      },
    },
  },
});

const REWARD_MANIFEST = harden({
  [econBehaviors.startRewardDistributor.name]: {
    consume: {
      chainTimerService: true,
      bankManager: true,
      vaultFactoryKit: true,
      periodicFeeCollectors: true,
      ammKit: true,
      stakeFactoryKit: true,
      reserveKit: true,
      zoe: true,
    },
    produce: { feeDistributorKit: true, periodicFeeCollectors: true },
    instance: { produce: { feeDistributor: true } },
    installation: { consume: { feeDistributor: true } },
    issuer: { consume: { [Stable.symbol]: 'zoe' } },
    brand: { consume: { [Stable.symbol]: 'zoe' } },
  },
});

const STAKE_FACTORY_MANIFEST = harden({
  [econBehaviors.startLienBridge.name]: {
    consume: { bridgeManager: true },
    produce: { lienBridge: true },
    brand: {
      consume: { BLD: 'BLD' },
    },
  },
  [econBehaviors.startStakeFactory.name]: {
    consume: {
      board: 'board',
      chainStorage: true,
      zoe: 'zoe',
      feeMintAccess: 'zoe',
      lienBridge: true,
      client: 'provisioning',
      chainTimerService: 'timer',
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: {
      stakeFactoryKit: 'stakeFactory',
    },
    installation: {
      consume: { contractGovernor: 'zoe', stakeFactory: 'zoe' },
    },
    instance: {
      produce: { stakeFactory: 'stakeFactory' },
    },
    brand: {
      consume: { BLD: 'BLD', [Stable.symbol]: 'zoe' },
      produce: { Attestation: 'stakeFactory' },
    },
    issuer: {
      consume: { BLD: 'BLD' },
      produce: { Attestation: 'stakeFactory' },
    },
  },
});

export const SIM_CHAIN_MANIFEST = harden({
  [simBehaviors.fundAMM.name]: {
    consume: {
      centralSupplyBundle: true,
      mintHolderBundle: true,
      chainTimerService: 'timer',
      bldIssuerKit: true,
      feeMintAccess: true,
      loadVat: true,
      mints: 'mints',
      priceAuthorityVat: 'priceAuthority',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryKit: 'VaultFactory',
      zoe: true,
    },
    installation: {
      consume: { centralSupply: 'zoe' },
    },
    issuer: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm' },
    },
  },
});

export const getManifestForEconCommittee = (
  { restoreRef },
  { installKeys, econCommitteeOptions },
) => {
  return {
    manifest: ECON_COMMITTEE_MANIFEST,
    installations: {
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
    options: {
      econCommitteeOptions,
    },
  };
};

export const getManifestForMain = (
  { restoreRef },
  {
    installKeys,
    vaultFactoryControllerAddress,
    minInitialPoolLiquidity,
    endorsedUi,
  },
) => {
  return {
    manifest: SHARED_MAIN_MANIFEST,
    installations: {
      amm: restoreRef(installKeys.amm),
      VaultFactory: restoreRef(installKeys.vaultFactory),
      feeDistributor: restoreRef(installKeys.feeDistributor),
      liquidate: restoreRef(installKeys.liquidate),
      reserve: restoreRef(installKeys.reserve),
      interchainPool: restoreRef(installKeys.interchainPool),
    },
    options: {
      vaultFactoryControllerAddress,
      minInitialPoolLiquidity,
      endorsedUi,
    },
  };
};

const roleToManifest = harden({
  chain: {
    ...REWARD_MANIFEST,
    ...STAKE_FACTORY_MANIFEST,
  },
  'sim-chain': SIM_CHAIN_MANIFEST,
  client: {},
});

export const getManifestForInterProtocol = (
  { restoreRef },
  {
    ROLE = 'chain',
    econCommitteeOptions,
    installKeys,
    vaultFactoryControllerAddress,
    minInitialPoolLiquidity,
    endorsedUi,
  },
) => {
  const econCommitteeManifest = getManifestForEconCommittee(
    { restoreRef },
    { installKeys, econCommitteeOptions },
  );
  const mainManifest = getManifestForMain(
    { restoreRef },
    {
      installKeys,
      vaultFactoryControllerAddress,
      minInitialPoolLiquidity,
      endorsedUi,
    },
  );
  return {
    manifest: {
      ...econCommitteeManifest.manifest,
      ...mainManifest.manifest,
      ...roleToManifest[ROLE],
    },
    installations: {
      ...econCommitteeManifest.installations,
      ...mainManifest.installations,
      stakeFactory: restoreRef(installKeys.stakeFactory),
    },
    options: {
      ...econCommitteeManifest.options,
      ...mainManifest.options,
      vaultFactoryControllerAddress,
    },
  };
};
