// @ts-check
/** @file Boot script for PSM-only (aka Pismo) chain */
import * as ERTPmod from '@agoric/ertp';
import { Far } from '@endo/far';
// TODO: factor startEconomicCommittee out of econ-behaviors.js
import { M, mustMatch } from '@agoric/store';
import {
  addBankAssets,
  buildZoe,
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
  makeVatsFromBundles,
  mintInitialSupply,
  produceStartGovernedUpgradable,
  produceStartUpgradable,
} from '@agoric/vats/src/core/basic-behaviors.js';
import {
  bridgeCoreEval,
  bridgeProvisioner,
  CHAIN_BOOTSTRAP_MANIFEST,
  makeBridgeManager,
  makeChainStorage,
  noProvisioner,
  publishAgoricNames,
  startTimerService,
} from '@agoric/vats/src/core/chain-behaviors.js';
import { makePromiseSpace } from '@agoric/vats/src/core/promise-space.js';
import {
  startWalletFactory,
  WALLET_FACTORY_MANIFEST,
} from '@agoric/vats/src/core/startWalletFactory.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { Stable, Stake } from '@agoric/vats/src/tokens.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  ECON_COMMITTEE_MANIFEST,
  startEconomicCommittee,
} from '../../src/proposals/startEconCommittee.js';
import * as startPSMmod from '../../src/proposals/startPSM.js';
import {
  installGovAndPSMContracts,
  inviteCommitteeMembers,
  inviteToEconCharter,
  INVITE_PSM_COMMITTEE_MANIFEST,
  makeAnchorAsset,
  PSM_GOV_MANIFEST,
  PSM_MANIFEST,
  startEconCharter,
  startPSM,
} from '../../src/proposals/startPSM.js';

/** @typedef {import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} EconomyBootstrapSpace */

/**
 * We reserve these keys in name hubs.
 */
export const agoricNamesReserved = harden(
  /** @type {const} */ ({
    issuer: {
      [Stake.symbol]: Stake.proposedName,
      [Stable.symbol]: Stable.proposedName,
      AUSD: 'Agoric bridged USDC',
    },
    brand: {
      [Stake.symbol]: Stake.proposedName,
      [Stable.symbol]: Stable.proposedName,
      AUSD: 'Agoric bridged USDC',
    },
    vbankAsset: {
      [Stake.symbol]: Stake.proposedName,
      [Stable.symbol]: Stable.proposedName,
    },
    oracleBrand: {
      USD: 'US Dollar',
    },
    installation: {
      centralSupply: 'central supply',
      mintHolder: 'mint holder',
      walletFactory: 'multitenant smart wallet',
      contractGovernor: 'contract governor',
      committee: 'committee electorate',
      binaryVoteCounter: 'binary vote counter',
      psm: 'Parity Stability Module',
      econCommitteeCharter: 'Econ Governance Charter',
    },
    instance: {
      economicCommittee: 'Economic Committee',
      'psm-IST-AUSD': 'Parity Stability Module: IST:AUSD',
      econCommitteeCharter: 'Econ Governance Charter',
      walletFactory: 'Smart Wallet Factory',
      provisionPool: 'Provision Pool',
    },
  }),
);

/**
 * @typedef {{
 *   denom: string,
 *   keyword?: string,
 *   proposedName?: string,
 *   decimalPlaces?: number
 * }} AnchorOptions
 */
const AnchorOptionsShape = M.splitRecord(
  { denom: M.string() },
  {
    keyword: M.string(),
    proposedName: M.string(),
    decimalPlaces: M.number(),
  },
);

export const ParametersShape = M.splitRecord(
  {},
  {
    anchorAssets: M.arrayOf(AnchorOptionsShape),
    economicCommitteeAddresses: M.recordOf(M.string(), M.string()),
  },
);

/**
 * Build root object of the PSM-only bootstrap vat.
 *
 * @param {{
 *   D: DProxy
 *   logger?: (msg: string) => void
 * }} vatPowers
 * @param {{
 *     economicCommitteeAddresses: Record<string, string>,
 *     anchorAssets: { denom: string, keyword?: string }[],
 * }} vatParameters
 */
export const buildRootObject = (vatPowers, vatParameters) => {
  const log = vatPowers.logger || console.info;

  mustMatch(harden(vatParameters), ParametersShape, 'boot-psm params');
  const { anchorAssets, economicCommitteeAddresses } = vatParameters;

  const { produce, consume } = makePromiseSpace(log);
  const { agoricNames, agoricNamesAdmin, spaces } = utils.makeAgoricNamesAccess(
    log,
    agoricNamesReserved,
  );
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const runBootstrapParts = async (vats, devices) => {
    /** TODO: BootstrapPowers type puzzle */
    /** @type { any } */
    const allPowers = harden({
      vatPowers,
      vatParameters,
      vats,
      devices,
      produce,
      consume,
      ...spaces,
      // ISSUE: needed? runBehaviors,
      // These module namespaces might be useful for core eval governance.
      modules: {
        utils: { ...utils },
        startPSM: { ...startPSMmod },
        ERTP: { ...ERTPmod },
      },
    });
    const manifest = {
      ...CHAIN_BOOTSTRAP_MANIFEST,
      ...WALLET_FACTORY_MANIFEST,
      ...PSM_GOV_MANIFEST,
      ...ECON_COMMITTEE_MANIFEST,
      ...PSM_MANIFEST,
      ...INVITE_PSM_COMMITTEE_MANIFEST,
      [noProvisioner.name]: {
        produce: {
          provisioning: 'provisioning',
        },
      },
    };
    /** @param {string} name */
    const powersFor = name => {
      const permit = manifest[name];
      assert(permit, `missing permit for ${name}`);
      return utils.extractPowers(permit, allPowers);
    };

    await Promise.all([
      produceStartUpgradable(powersFor('produceStartUpgradable')),
      produceStartGovernedUpgradable(
        powersFor('produceStartGovernedUpgradable'),
      ),
      makeVatsFromBundles(powersFor('makeVatsFromBundles')),
      buildZoe(powersFor('buildZoe')),
      makeBoard(powersFor('makeBoard')),
      makeBridgeManager(powersFor('makeBridgeManager')),
      noProvisioner(powersFor('noProvisioner')),
      bridgeProvisioner(powersFor('bridgeProvisioner')),
      makeChainStorage(powersFor('makeChainStorage')),
      makeAddressNameHubs(powersFor('makeAddressNameHubs')),
      publishAgoricNames(powersFor('publishAgoricNames'), {
        options: {
          agoricNamesOptions: { topLevel: Object.keys(agoricNamesReserved) },
        },
      }),
      startWalletFactory(powersFor('startWalletFactory')),
      mintInitialSupply(powersFor('mintInitialSupply')),
      addBankAssets(powersFor('addBankAssets')),
      startTimerService(powersFor('startTimerService')),
      installBootContracts(powersFor('installBootContracts')),
      installGovAndPSMContracts(powersFor('installGovAndPSMContracts')),
      startEconomicCommittee(powersFor('startEconomicCommittee'), {
        options: {
          econCommitteeOptions: {
            committeeSize: Object.values(economicCommitteeAddresses).length,
          },
        },
      }),
      inviteCommitteeMembers(powersFor('inviteCommitteeMembers'), {
        options: { voterAddresses: economicCommitteeAddresses },
      }),
      inviteToEconCharter(powersFor('inviteToEconCharter'), {
        options: { voterAddresses: economicCommitteeAddresses },
      }),
      ...anchorAssets.map(anchorOptions =>
        makeAnchorAsset(powersFor('makeAnchorAsset'), {
          options: { anchorOptions },
        }),
      ),
      ...anchorAssets.map(anchorOptions =>
        startPSM(powersFor(startPSM.name), {
          options: { anchorOptions },
        }),
      ),
      startEconCharter(powersFor('startEconCharter')),
      // Allow bootstrap powers to be granted by governance
      // to code to be evaluated after initial bootstrap.
      bridgeCoreEval(powersFor('bridgeCoreEval')),
    ]);
    // xxx this doesn't ever resolve yet, due to a dropped promise in startPSM (datalock)
    console.log('boot-psm fully resolved');
  };

  return Far('bootstrap', {
    bootstrap: (vats, devices) => {
      const { D } = vatPowers;
      D(devices.mailbox).registerInboundHandler(
        Far('dummyInboundHandler', { deliverInboundMessages: () => {} }),
      );

      return runBootstrapParts(vats, devices).catch(e => {
        console.error('BOOTSTRAP FAILED:', e);
        throw e;
      });
    },
    /**
     * Allow kernel to provide things to CORE_EVAL.
     *
     * @param {string} name
     * @param {unknown} resolution
     */
    produceItem: (name, resolution) => {
      assert.typeof(name, 'string');
      produce[name].resolve(resolution);
    },
    // expose reset in case we need to do-over
    resetItem: name => {
      assert.typeof(name, 'string');
      produce[name].reset();
    },
    // expose consume mostly for testing
    consumeItem: name => {
      assert.typeof(name, 'string');
      return consume[name];
    },
    // ??? any more dangerous than produceItem/consumeItem?
    /** @type {() => PromiseSpace} */
    getPromiseSpace: () => ({ consume, produce, ...spaces }),
  });
};

harden({ buildRootObject });
