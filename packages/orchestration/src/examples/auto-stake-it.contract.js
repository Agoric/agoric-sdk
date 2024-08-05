import {
  EmptyProposalShape,
  InvitationShape,
} from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { preparePortfolioHolder } from '../exos/portfolio-holder-kit.js';
import { withOrchestration } from '../utils/start-helper.js';
import { ChainAddressShape } from '../typeGuards.js';
import { prepareStakingTap } from './auto-stake-it-tap-kit.js';
import * as flows from './auto-stake-it.flows.js';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosInterchainService, CosmosValidatorAddress} from '@agoric/orchestration';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   agoricNames: Remote<NameHub>;
 * }} OrchestrationPowers
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
 * }} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  _privateArgs,
  zone,
  { chainHub, orchestrateAll, vowTools },
) => {
  const makeStakingTap = prepareStakingTap(
    zone.subZone('stakingTap'),
    vowTools,
  );
  const makePortfolioHolder = preparePortfolioHolder(
    zone.subZone('portfolio'),
    vowTools,
    {
      extraStateShape: {
        tapHolder: M.remotable('Staking Tap Kit Holder'),
        appRegistration: M.remotable('Target Registration'),
      },
      extraInvitationMakerGuards: {
        UpdateValidator: M.call(ChainAddressShape).returns(M.promise()),
        CancelAutoStake: M.call().returns(M.promise()),
      },
      extraInvitationMakerMethods: {
        /** @param {CosmosValidatorAddress} validator */
        UpdateValidator(validator) {
          return zcf.makeInvitation(
            seat => {
              seat.exit();
              // @ts-expect-error Property 'tapHolder' does not exist on type 'Method'.ts(2339)
              return E(this.state.tapHolder).updateValidator(validator);
            },
            'UpdateValidator',
            undefined,
            EmptyProposalShape,
          );
        },
        CancelAutoStake() {
          return zcf.makeInvitation(
            seat => {
              seat.exit();
              // @ts-expect-error Property 'appRegistration' does not exist on type 'Method'.ts(2339)
              return E(this.state.appRegistration).revoke();
            },
            'CancelAutoStake',
            undefined,
            EmptyProposalShape,
          );
        },
      },
    },
  );

  const { makeAccounts } = orchestrateAll(flows, {
    makeStakingTap,
    makePortfolioHolder,
    chainHub,
  });

  const publicFacet = zone.exo(
    'AutoStakeIt Public Facet',
    M.interface('AutoStakeIt Public Facet', {
      makeAccountsInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeAccountsInvitation() {
        return zcf.makeInvitation(
          makeAccounts,
          'Make Accounts',
          undefined,
          EmptyProposalShape,
        );
      },
    },
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  return { publicFacet, creatorFacet };
};

export const start = withOrchestration(contract);

/** @typedef {typeof start} AutoStakeItSF */
