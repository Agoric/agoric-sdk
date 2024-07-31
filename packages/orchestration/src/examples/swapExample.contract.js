import { StorageNodeShape } from '@agoric/internal';
import { TimerServiceShape } from '@agoric/time';
import { M } from '@endo/patterns';
import { assertIssuerKeywords } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { E } from '@endo/far';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './swapExample.flows.js';
import fetchedChainInfo from '../fetched-chain-info.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = {
  privateArgsShape: {
    agoricNames: M.remotable('agoricNames'),
    localchain: M.remotable('localchain'),
    orchestrationService: M.or(M.remotable('orchestration'), null),
    storageNode: StorageNodeShape,
    marshaller: M.remotable('marshaller'),
    timerService: M.or(TimerServiceShape, null),
  },
  upgradability: 'canUpgrade',
};
harden(meta);

// XXX copied from inter-protocol
// TODO move to new `@agoric/contracts` package when we have it
/**
 * @param {Brand} brand must be a 'nat' brand, not checked
 * @param {NatValue} [min]
 */
export const makeNatAmountShape = (brand, min) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF<{ baseDenom: string; baseName: string }>} zcf
 * @param {import('../utils/start-helper.js').OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  privateArgs,
  zone,
  { zoeTools, orchestrateAll, chainHub },
) => {
  assertIssuerKeywords(zcf, ['Stable', 'Out']);
  const { brands, baseDenom, baseName } = zcf.getTerms();

  const handlers = orchestrateAll(flows, {
    zcf,
    localTransfer: zoeTools.localTransfer,
    brandOut: brands.Out,
  });

  const assets = await E(
    E(privateArgs.agoricNames).lookup('vbankAsset'),
  ).values();
  const info = assets.find(a => a.brand === brands.Out);
  for (const chainName of ['agoric', 'omniflixhub']) {
    chainHub.registerChain(chainName, fetchedChainInfo[chainName]);
  }
  chainHub.registerAsset(info.denom, {
    baseDenom,
    baseName,
    chainName: 'agoric',
  });

  const publicFacet = zone.exo('publicFacet', undefined, {
    makeSwapAndStakeInvitation() {
      return zcf.makeInvitation(
        handlers.swapAndStake,
        'Swap for TIA and stake',
        undefined,
        harden({
          give: { Stable: makeNatAmountShape(brands.Stable, 1n) },
          want: {}, // XXX ChainAccount Ownable?
          exit: M.any(),
        }),
      );
    },
  });

  return harden({ publicFacet });
};

export const start = withOrchestration(contract);
