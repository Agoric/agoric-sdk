/**
 * @file This contract demonstrates using AuthZ to control an existing account
 *   with an orchestration account.
 *
 *   `MsgExec` is only part of the story, please see
 *   {@link ../../../../multichain-testing/test/auth-z-example.test.ts} for an
 *   example of client usage which involves `MsgGrant` txs from the grantee.
 */
import { M } from '@endo/patterns';
import { prepareCombineInvitationMakers } from '../exos/combine-invitation-makers.js';
import { CosmosOrchestrationInvitationMakersI } from '../exos/cosmos-orchestration-account.js';
import { AmountArgShape, ChainAddressShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './authz-example.flows.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools, OrchestrationPowers} from '../utils/start-helper.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {AmountArg, ChainAddress, CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 */

const emptyOfferShape = harden({
  // Nothing to give; the funds are deposited offline
  give: {},
  want: {}, // UNTIL https://github.com/Agoric/agoric-sdk/issues/2230
  exit: M.any(),
});

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe.
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo: Record<string, CosmosChainInfo>;
 *   assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  privateArgs,
  zone,
  { orchestrateAll, zoeTools, chainHub },
) => {
  const AuthzExampleInvitationMakersI = M.interface(
    'AuthzExampleInvitationMakersI',
    {
      ExecSend: M.call(
        M.arrayOf(AmountArgShape),
        ChainAddressShape,
        ChainAddressShape,
      ).returns(M.promise()),
    },
  );

  /** @type {any} XXX async membrane */
  const makeExtraInvitationMaker = zone.exoClass(
    'AuthzExampleInvitationMakers',
    AuthzExampleInvitationMakersI,
    /**
     * @param {GuestInterface<CosmosOrchestrationAccount>} account
     * @param {string} chainName
     */
    (account, chainName) => {
      return { account, chainName };
    },
    {
      /**
       * @param {AmountArg[]} amounts
       * @param {ChainAddress} destination
       * @param {ChainAddress} grantee
       */
      ExecSend(amounts, destination, grantee) {
        const { account } = this.state;

        return zcf.makeInvitation(
          seat =>
            orchFns.execSend(account, seat, {
              amounts,
              destination,
              grantee,
            }),
          'Exec Send',
          undefined,
          emptyOfferShape,
        );
      },
    },
  );

  /** @type {any} XXX async membrane */
  const makeCombineInvitationMakers = prepareCombineInvitationMakers(
    zone,
    CosmosOrchestrationInvitationMakersI,
    AuthzExampleInvitationMakersI,
  );

  const orchFns = orchestrateAll(flows, {
    chainHub,
    makeCombineInvitationMakers,
    makeExtraInvitationMaker,
    flows,
    zoeTools,
  });

  /**
   * Provide invitations to contract deployer for registering assets and chains
   * in the local ChainHub for this contract.
   */
  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  const publicFacet = zone.exo('publicFacet', undefined, {
    makeAccount() {
      return zcf.makeInvitation(
        orchFns.makeAccount,
        'Make an Orchestration account',
        undefined,
        emptyOfferShape,
      );
    },
  });

  return harden({ publicFacet, creatorFacet });
};

export const start = withOrchestration(contract);
harden(start);

/** @typedef {typeof start} AuthzExampleSF */
