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
import { CosmosOrchestrationInvitationMakersInterface } from '../exos/cosmos-orchestration-account.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './staking-combinations.flows.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {ContinuingOfferResult} from '@agoric/smart-wallet/src/types.js';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Vow} from '@agoric/vow';
 * @import {Remote} from '@agoric/internal';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosInterchainService} from '../exos/exo-interfaces.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {AmountArg, CosmosValidatorAddress} from '../types.js';
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
 * @param {{
 *   agoricNames: Remote<NameHub>;
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   marshaller: Marshaller;
 *   timerService: Remote<TimerService>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (zcf, privateArgs, zone, { orchestrateAll }) => {
  const ExtraInvitationMakerInterface = M.interface('', {
    DepositAndDelegate: M.call(M.array()).returns(M.promise()),
    UndelegateAndTransfer: M.call(M.array()).returns(M.promise()),
  });
  /** @type {any} XXX async membrane */
  const makeExtraInvitationMaker = zone.exoClass(
    'ContinuingInvitationExampleInvitationMakers',
    ExtraInvitationMakerInterface,
    /** @param {GuestInterface<CosmosOrchestrationAccount>} account */
    account => {
      return { account };
    },
    {
      DepositAndDelegate() {
        const { account } = this.state;

        return zcf.makeInvitation(
          (seat, validatorAddr, amountArg) =>
            // eslint-disable-next-line no-use-before-define -- defined by orchestrateAll, necessarily after this
            orchFns.depositAndDelegate(account, seat, validatorAddr, amountArg),
          'Deposit and delegate',
          undefined,
          {
            give: {
              Stake: AmountShape,
            },
          },
        );
      },
      /**
       * @param {{ amount: AmountArg; validator: CosmosValidatorAddress }[]} delegations
       */
      UndelegateAndTransfer(delegations) {
        const { account } = this.state;

        return zcf.makeInvitation(
          // eslint-disable-next-line no-use-before-define -- defined by orchestrateAll, necessarily after this
          () => orchFns.undelegateAndTransfer(account, delegations),
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
    CosmosOrchestrationInvitationMakersInterface,
    ExtraInvitationMakerInterface,
  );

  const orchFns = orchestrateAll(flows, {
    makeCombineInvitationMakers,
    makeExtraInvitationMaker,
    flows,
    zcf,
  });

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

  return harden({ publicFacet });
};

export const start = withOrchestration(contract);
harden(start);
