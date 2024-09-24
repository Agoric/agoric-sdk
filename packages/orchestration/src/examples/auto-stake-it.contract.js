import {
  EmptyProposalShape,
  InvitationShape,
} from '@agoric/zoe/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { preparePortfolioHolder } from '../exos/portfolio-holder-kit.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './auto-stake-it.flows.js';
import { ChainAddressShape } from '../typeGuards.js';

const trace = makeTracer('AutoStakeIt');

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {ChainAddress, CosmosValidatorAddress, Denom} from '@agoric/orchestration';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {LocalOrchestrationAccount} from '../exos/local-orchestration-account.js';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @typedef {{
 *   stakingAccount: GuestInterface<CosmosOrchestrationAccount>;
 *   localAccount: GuestInterface<LocalOrchestrationAccount>;
 *   config: {
 *     validator: CosmosValidatorAddress;
 *     localChainAddress: ChainAddress;
 *     remoteChainAddress: ChainAddress;
 *     sourceChannel: IBCChannelID;
 *     remoteDenom: Denom;
 *     localDenom: Denom;
 *   };
 * }} StakingTapState
 */

const StakingTapStateShape = harden({
  stakingAccount: M.remotable('CosmosOrchestrationAccount'),
  localAccount: M.remotable('LocalOrchestrationAccount'),
  config: {
    validator: ChainAddressShape,
    localChainAddress: ChainAddressShape,
    remoteChainAddress: ChainAddressShape,
    sourceChannel: M.string(),
    remoteDenom: M.string(),
    localDenom: M.string(),
  },
});

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
  const makePortfolioHolder = preparePortfolioHolder(
    zone.subZone('portfolio'),
    vowTools,
  );

  /**
   * Provides a {@link TargetApp} that reacts to an incoming IBC transfer.
   */
  const makeStakingTap = zone.exoClass(
    'StakingTap',
    M.interface('AutoStakeItTap', {
      receiveUpcall: M.call(M.record()).returns(M.undefined()),
    }),
    /** @param {StakingTapState} initialState */
    initialState => harden(initialState),
    {
      /**
       * Transfers from localAccount to stakingAccount, then delegates from the
       * stakingAccount to `validator` if the expected token (remoteDenom) is
       * received.
       *
       * @param {VTransferIBCEvent} event
       */
      receiveUpcall(event) {
        trace('receiveUpcall', event);
        const { localAccount, stakingAccount, config } = this.state;
        // eslint-disable-next-line no-use-before-define -- defined by orchestrateAll, necessarily after this
        orchFns.autoStake(localAccount, stakingAccount, config, event);
      },
    },
    {
      stateShape: StakingTapStateShape,
    },
  );

  const orchFns = orchestrateAll(flows, {
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
          orchFns.makeAccounts,
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
harden(start);

/** @typedef {typeof start} AutoStakeItSF */
