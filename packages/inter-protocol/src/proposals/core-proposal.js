// @jessie-check

import { Stable } from '@agoric/internal/src/tokens.js';
import * as econBehaviors from './econ-behaviors.js';
import { ECON_COMMITTEE_MANIFEST } from './startEconCommittee.js';

export * from './econ-behaviors.js';
export * from './startPSM.js';
export * from './startEconCommittee.js';

// XXX all the startInstance() should use startUpgradable()
// or startGovernedUpgradeable() but that would
// require updating a lot of tests. So for now, we just
// grab the kits afterward and store them.

/** @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers */
export const storeInterContractStartKits = async ({
  consume: {
    contractKits,
    governedContractKits,
    econCharterKit,
    economicCommitteeKit,
    feeDistributorKit,
    auctioneerKit,
    reserveKit,
    vaultFactoryKit,
  },
}) => {
  /**
   * @param {Promise<MapStore<Instance, { instance: Instance }>>} storeP
   * @param {Promise<{ instance: Instance }>[]} kitPs
   */
  const storeAll = async (storeP, kitPs) => {
    const store = await storeP;
    const kits = await Promise.all(kitPs);
    for (const kit of kits) {
      store.init(kit.instance, kit);
    }
  };

  await storeAll(contractKits, [
    economicCommitteeKit,
    econCharterKit,
    feeDistributorKit,
  ]);
  await storeAll(governedContractKits, [
    auctioneerKit,
    reserveKit,
    vaultFactoryKit,
  ]);
};

/** @type {import('@agoric/vats/src/core/lib-boot.js').BootstrapManifest} */
const SHARED_MAIN_MANIFEST = harden({
  /** @type {import('@agoric/vats/src/core/lib-boot.js').BootstrapManifestPermit} */
  [econBehaviors.startVaultFactory.name]: {
    consume: {
      board: 'board',
      chainStorage: true,
      diagnostics: true,
      feeMintAccess: 'zoe',
      chainTimerService: 'timer',
      zoe: 'zoe',
      priceAuthority: 'priceAuthority',
      economicCommitteeCreatorFacet: 'economicCommittee',
      reserveKit: 'reserve',
      auctioneerKit: 'auction',
    },
    produce: { vaultFactoryKit: 'VaultFactory' },
    brand: { consume: { [Stable.symbol]: 'zoe' } },
    oracleBrand: { consume: { USD: true } },
    installation: {
      consume: {
        contractGovernor: 'zoe',
        VaultFactory: 'zoe',
      },
    },
    instance: {
      consume: {
        reserve: 'reserve',
        auctioneer: 'auction',
      },
      produce: {
        VaultFactory: 'VaultFactory',
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
      board: 'board',
      chainStorage: true,
      diagnostics: true,
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
      produce: {
        reserve: 'reserve',
        reserveGovernor: 'ReserveGovernor',
      },
    },
  },

  [econBehaviors.startAuctioneer.name]: {
    consume: {
      zoe: 'zoe',
      board: 'board',
      chainTimerService: 'timer',
      priceAuthority: 'priceAuthority',
      chainStorage: true,
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: { auctioneerKit: 'auction' },
    instance: {
      produce: { auctioneer: 'auction' },
      consume: { reserve: 'auction' },
    },
    installation: {
      consume: { contractGovernor: 'zoe', auctioneer: 'zoe' },
    },
    issuer: {
      consume: { [Stable.symbol]: 'zoe' },
    },
  },

  [storeInterContractStartKits.name]: {
    consume: {
      contractKits: true,
      governedContractKits: true,
      econCharterKit: true,
      economicCommitteeKit: true,
      feeDistributorKit: true,
      auctioneerKit: true,
      reserveKit: true,
      vaultFactoryKit: true,
    },
  },
});

const REWARD_MANIFEST = harden({
  [econBehaviors.startRewardDistributor.name]: {
    consume: {
      chainTimerService: true,
      diagnostics: true,
      bankManager: true,
      vaultFactoryKit: true,
      periodicFeeCollectors: true,
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

export const SIM_CHAIN_MANIFEST = harden({});

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
    referencedUi,
  },
) => {
  return {
    manifest: SHARED_MAIN_MANIFEST,
    installations: {
      VaultFactory: restoreRef(installKeys.vaultFactory),
      auctioneer: restoreRef(installKeys.auctioneer),
      feeDistributor: restoreRef(installKeys.feeDistributor),
      reserve: restoreRef(installKeys.reserve),
    },
    options: {
      vaultFactoryControllerAddress,
      minInitialPoolLiquidity,
      referencedUi,
    },
  };
};

export const getManifestForInterProtocol = (
  { restoreRef },
  {
    econCommitteeOptions,
    installKeys,
    vaultFactoryControllerAddress,
    minInitialPoolLiquidity,
    referencedUi,
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
      referencedUi,
    },
  );
  return {
    manifest: {
      ...econCommitteeManifest.manifest,
      ...mainManifest.manifest,
      ...REWARD_MANIFEST,
    },
    installations: {
      ...econCommitteeManifest.installations,
      ...mainManifest.installations,
    },
    options: {
      ...econCommitteeManifest.options,
      ...mainManifest.options,
      vaultFactoryControllerAddress,
    },
  };
};
