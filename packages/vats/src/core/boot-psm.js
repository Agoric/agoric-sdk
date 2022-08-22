// @ts-check
import { Far } from '@endo/far';
import {
  installGovAndPSMContracts,
  makeAnchorAsset,
  startPSM,
} from '@agoric/inter-protocol/src/proposals/startPSM.js';
import { startEconomicCommittee } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { makeAgoricNamesAccess, makePromiseSpace } from './utils.js';
import { Stable, Stake } from '../tokens.js';
import {
  addBankAssets,
  buildZoe,
  installBootContracts,
  makeBoard,
  makeVatsFromBundles,
  mintInitialSupply,
} from './basic-behaviors.js';
import * as utils from './utils.js';
import {
  makeBridgeManager,
  makeChainStorage,
  setupClientManager,
  startTimerService,
} from './chain-behaviors.js';

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
    installation: {
      centralSupply: 'central supply',
      mintHolder: 'mint holder',
      walletFactory: 'multitenant smart wallet',
      contractGovernor: 'contract governor',
      committee: 'committee electorate',
      binaryVoteCounter: 'binary vote counter',
      psm: 'Parity Stability Module',
    },
    instance: {
      economicCommittee: 'Economic Committee',
      psm: 'Parity Stability Module',
      psmGovernor: 'PSM Governor',
    },
  }),
);

/**
 * Build root object of the PSM-only bootstrap vat.
 *
 * @param {{
 *   D: DProxy
 * }} vatPowers
 * @param {{
 *   argv: {
 *     economicCommitteeAddresses: string[],
 *     anchorDenom,
 *  },
 * }} vatParameters
 */
export const buildRootObject = (vatPowers, vatParameters) => {
  // @ts-expect-error no TS defs for rickety test scaffolding
  const log = vatPowers.logger || console.info;

  const {
    argv: { anchorDenom, economicCommitteeAddresses },
  } = vatParameters;

  const { produce, consume } = makePromiseSpace(log);
  // ISSUE: the list of names to reserve in makeAgoricNamesAccess
  // includes amm and VaultFactory, which shows excess coupling.
  // These promises are not resolved, but the names _are_ visible at runtime.
  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess(
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
      },
    });
    await Promise.all([
      makeVatsFromBundles(allPowers),
      buildZoe(allPowers),
      makeBoard(allPowers),
      makeBridgeManager(allPowers),
      makeChainStorage(allPowers),
      setupClientManager(allPowers),
      mintInitialSupply(allPowers),
      addBankAssets(allPowers),
      startTimerService(allPowers),
      // centralSupply, mintHolder, walletFactory
      installBootContracts(allPowers),
      installGovAndPSMContracts(allPowers),
      startEconomicCommittee(allPowers, {
        options: {
          econCommitteeOptions: {
            committeeSize: economicCommitteeAddresses.length,
          },
        },
      }),
      makeAnchorAsset(allPowers, {
        options: { anchorOptions: { denom: anchorDenom } },
      }),
      startPSM(allPowers, {
        options: { anchorOptions: { denom: anchorDenom } },
      }),
    ]);
  };

  return Far('bootstrap', {
    bootstrap: (vats, devices) =>
      runBootstrapParts(vats, devices).catch(e => {
        console.error('BOOTSTRAP FAILED:', e);
        throw e;
      }),
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
  });
};

harden({ buildRootObject });
