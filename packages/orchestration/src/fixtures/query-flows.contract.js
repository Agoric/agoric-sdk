/**
 * @file Testing fixture for Local and Interchain Queries
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
import * as flows from './query-flows.flows.js';

/**
 * @import {ZCF} from '@agoric/zoe';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 */

/**
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
  { chainHub, orchestrateAll },
) => {
  const orchFns = orchestrateAll(flows, {});

  const publicFacet = zone.exo(
    'Query Flows Public Facet',
    M.interface('Query Flows PF', {
      makeSendICQQueryInvitation: M.callWhen().returns(InvitationShape),
      makeAccountAndGetBalanceQueryInvitation:
        M.callWhen().returns(InvitationShape),
      makeAccountAndGetBalancesQueryInvitation:
        M.callWhen().returns(InvitationShape),
      makeSendLocalQueryInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendICQQueryInvitation() {
        return zcf.makeInvitation(
          orchFns.sendICQQuery,
          'Submit a query to a remote chain',
        );
      },
      makeAccountAndGetBalanceQueryInvitation() {
        return zcf.makeInvitation(
          orchFns.makeAccountAndGetBalanceQuery,
          'Make an account and submit a balance query',
        );
      },
      makeAccountAndGetBalancesQueryInvitation() {
        return zcf.makeInvitation(
          orchFns.makeAccountAndGetBalancesQuery,
          'Make an account and submit a balance query',
        );
      },
      makeSendLocalQueryInvitation() {
        return zcf.makeInvitation(
          orchFns.sendLocalQuery,
          'Submit a query to the local chain',
        );
      },
    },
  );

  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  return { publicFacet };
};

export const start = withOrchestration(contract, { publishAccountInfo: true });
harden(start);

/** @typedef {typeof start} QueryFlowsSF */
