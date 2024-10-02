/**
 * @file This contract demonstrates the continuing invitation pattern with async
 *   flows.
 *
 *   The primary offer result is a power for invitation makers that can perform
 *   actions with an ICA account.
 */
import { AmountShape } from '@agoric/ertp';
import { M } from '@endo/patterns';
import { prepareCombineInvitationMakers } from '../exos/combine-invitation-makers.js';
import { CosmosOrchestrationInvitationMakersI } from '../exos/cosmos-orchestration-account.js';
import { ChainAddressShape, DelegationShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './staking-combinations.flows.js';
import * as sharedFlows from './shared.flows.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools, OrchestrationPowers} from '../utils/start-helper.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {AmountArg, ChainAddress, CosmosValidatorAddress} from '../types.js';
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
  const StakingCombinationsInvitationMakersI = M.interface(
    'StakingCombinationsInvitationMakersI',
    {
      DepositAndDelegate: M.call().returns(M.promise()),
      UndelegateAndTransfer: M.call(
        M.arrayOf(DelegationShape),
        ChainAddressShape,
      ).returns(M.promise()),
    },
  );

  /** @type {any} XXX async membrane */
  const makeExtraInvitationMaker = zone.exoClass(
    'StakingCombinationsInvitationMakers',
    StakingCombinationsInvitationMakersI,
    /** @param {GuestInterface<CosmosOrchestrationAccount>} account */
    account => {
      return { account };
    },
    {
      DepositAndDelegate() {
        const { account } = this.state;

        return zcf.makeInvitation(
          /**
           * @param {ZCFSeat} seat
           * @param {{ validator: CosmosValidatorAddress }} offerArgs
           */
          (seat, { validator }) =>
            // eslint-disable-next-line no-use-before-define -- defined by orchestrateAll, necessarily after this
            orchFns.depositAndDelegate(account, seat, validator),
          'Deposit and delegate',
          undefined,
          {
            give: {
              Stake: AmountShape,
            },
            want: {},
            // user cannot exit their seat; contract must exit it.
            exit: { waived: M.null() },
          },
        );
      },
      /**
       * @param {{ amount: AmountArg; validator: CosmosValidatorAddress }[]} delegations
       * @param {ChainAddress} destination
       */
      UndelegateAndTransfer(delegations, destination) {
        const { account } = this.state;

        return zcf.makeInvitation(
          () =>
            // eslint-disable-next-line no-use-before-define -- defined by orchestrateAll, necessarily after this
            orchFns.undelegateAndTransfer(account, {
              delegations,
              destination,
            }),
          'Undelegate and transfer',
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
    StakingCombinationsInvitationMakersI,
  );

  const { makeLocalAccount } = orchestrateAll(sharedFlows, {});
  /**
   * Setup a shared local account for use in async-flow functions. Typically,
   * exo initState functions need to resolve synchronously, but `makeOnce`
   * allows us to provide a Promise. When using this inside a flow, we must
   * await it to ensure the account is available for use.
   *
   * @type {any} sharedLocalAccountP expects a Promise but this is a vow
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccountP = zone.makeOnce('localAccount', () =>
    makeLocalAccount(),
  );

  const orchFns = orchestrateAll(flows, {
    sharedLocalAccountP,
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
        'Make an ICA account',
        undefined,
        emptyOfferShape,
      );
    },
  });

  return harden({ publicFacet, creatorFacet });
};

export const start = withOrchestration(contract);
harden(start);
