import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import {
  makeAccountHandler,
  prepareRestakeHandler,
  // prepareCancelRestakeHandler,
} from './restake.flows.js';
import {
  restakeInvitaitonGuardShape,
  prepareRestakeWaker,
} from './restake.kit.js';
import { prepareCombineInvitationMakers } from '../exos/combine-invitation-makers.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers} from '../utils/start-helper.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * XXX consider moving to privateArgs / creatorFacet, as terms are immutable
 *
 * @typedef {{
 *   minimumDelay: bigint;
 *   minimumInterval: bigint;
 * }} RestakeContractTerms
 */

/**
 * @param {ZCF<RestakeContractTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  { timerService },
  zone,
  { orchestrate, vowTools },
) => {
  const makeRestakeWaker = prepareRestakeWaker(
    zone.subZone('restakeWaker'),
    vowTools,
  );
  const makeCombineInvitationMakers = prepareCombineInvitationMakers(
    zone,
    // restakeInvitaitonGuardShape,
    { Restake: restakeInvitaitonGuardShape.Restake },
  );

  const { minimumDelay, minimumInterval } = zcf.getTerms();

  const makeRestakeHandler = orchestrate(
    'prepareRestakeHandler',
    {
      makeRestakeWaker,
      timerService,
      opts: { minimumDelay, minimumInterval },
    },
    prepareRestakeHandler,
  );

  // const makeCancelRestakeHandler = orchestrate(
  //   'prepareCancelRestakeHandler',
  //   undefined,
  //   prepareCancelRestakeHandler,
  // );

  const makeAccount = orchestrate(
    'makeAccountHandler',
    {
      makeRestakeHandler,
      makeCombineInvitationMakers,
      // makeCancelRestakeHandler,
    },
    makeAccountHandler,
  );

  const publicFacet = zone.exo(
    'Restake Public Facet',
    M.interface('Restake PF', {
      makeRestakeAccountInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeRestakeAccountInvitation() {
        return zcf.makeInvitation(makeAccount, 'Make a Restake Account');
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);

/** @typedef {typeof start} RestakeSF */
