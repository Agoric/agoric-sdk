import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './restake.flows.js';
import {
  prepareRestakeHolderKit,
  prepareRestakeWaker,
  restakeInvitaitonGuardShape,
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
  { orchestrateAll, vowTools },
) => {
  const makeRestakeWaker = prepareRestakeWaker(
    zone.subZone('restakeWaker'),
    vowTools,
  );
  const makeCombineInvitationMakers = prepareCombineInvitationMakers(
    zone,
    restakeInvitaitonGuardShape,
  );

  const { minimumDelay, minimumInterval } = zcf.getTerms();

  const makeRestakeHolderKit = prepareRestakeHolderKit(
    zone.subZone('restakeHolder'),
    {
      vowTools,
      zcf,
      timer: timerService,
      makeRestakeWaker,
      params: harden({ minimumDelay, minimumInterval }),
    },
  );

  const orchFns = orchestrateAll(flows, {
    makeRestakeHolderKit,
    makeCombineInvitationMakers,
  });

  const publicFacet = zone.exo(
    'Restake Public Facet',
    M.interface('Restake PF', {
      makeRestakeAccountInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeRestakeAccountInvitation() {
        return zcf.makeInvitation(
          orchFns.makeRestakeAccount,
          'Make a Restake Account',
        );
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);

/** @typedef {typeof start} RestakeSF */
