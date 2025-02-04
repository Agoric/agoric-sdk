import {
    EmptyProposalShape,
    InvitationShape,
  } from '@agoric/zoe/src/typeGuards.js';
  import { M } from '@endo/patterns';
  import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
  import { preparePortfolioHolder } from '../exos/portfolio-holder-kit.js';
  import { withOrchestration } from '../utils/start-helper.js';
  import { prepareStrideStakingTap } from './elys-contract-tap-kit.js';
  import * as flows from './elys-contract-flow.js';
  import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
  import { E } from '@endo/far';

  

  const interfaceTODO = undefined;
  /**
   * @import {Zone} from '@agoric/zone';
   * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
   * @import {CosmosChainInfo, Denom, DenomDetail} from '../types.js';
   */
  
  /**
   * AutoStakeIt allows users to to create an auto-forwarding address that
   * transfers and stakes tokens on a remote chain when received.
   *
   * To be wrapped with `withOrchestration`.
   *
   * @param {ZCF} zcf
   * @param {OrchestrationPowers & {
   *   marshaller: Marshaller;
   *   chainInfo?: Record<string, CosmosChainInfo>;
   *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
   * }} privateArgs
   * @param {Zone} zone
   * @param {OrchestrationTools} tools
   */
  const contract = async (
    zcf,
    privateArgs,
    zone,
    { chainHub, orchestrateAll, vowTools }, // orchestration tools
  ) => {
    const makeStrideStakingTap = prepareStrideStakingTap(
      zone.subZone('strideStakingTap'),
      vowTools,
    );
  
    const { makeICAHookAccounts } = orchestrateAll(flows, {
      makeStrideStakingTap,
      chainHub,
    });

    const icaAndLocalAccount = zone.makeOnce('icaAndLocalAccount', _key =>
      makeICAHookAccounts({
        chainNames: allowedChains,
      }),
    );
  
    const { when } = vowTools;
  
    return {
      publicFacet: zone.exo('Public', interfaceTODO, {
        getLocalAddress: () => E(when(icaAndLocalAccount)).getAddress(),
      }),
      creatorFacet: zone.exo('MyCreator', undefined, {}),
    };
  
  };
  
  export const start = withOrchestration(contract);
  harden(start);
  
  /** @typedef {typeof start} AutoStakeItSF */
  

const allowedChains = ['cosmoshub']