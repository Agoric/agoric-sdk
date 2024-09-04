/**
 * @file Testing fixture for Local and Interchain Queries
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './query-flows.flows.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers} from '..//utils/start-helper.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (zcf, _privateArgs, zone, { orchestrateAll }) => {
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

  return { publicFacet };
};

export const start = withOrchestration(contract);
harden(start);

/** @typedef {typeof start} QueryFlowsSF */
