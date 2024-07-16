/**
 * @file Primarily a testing fixture, but also serves as an example of how to
 *   leverage basic functionality of the Orchestration API with async-flow.
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

/**
 * @import {Baggage} from '@agoric/vat-data';
 */

/**
 * @param {ZCF} zcf
 * @param {{
 *   evaluator: ERef<{
 *     evaluate(code: string): import('@agoric/vow').PromiseVow<any>;
 *   }>;
 *   storageNode: import('@agoric/internal/src/lib-chainStorage').StorageNode;
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);

  const vowTools = prepareSwingsetVowTools(zone.subZone('vow'));
  const { when } = vowTools;

  const makeInvitationMakers = zone.exoClass(
    'invitationMakers',
    M.interface('Evaluator Continuing Invitations', {
      Eval: M.callWhen(M.string()).returns(InvitationShape),
    }),
    evaluator => ({ evaluator }),
    {
      async Eval(stringToEval) {
        return zcf.makeInvitation(async zcfSeat => {
          const { evaluator } = this.state;
          console.info('evaluating', stringToEval);
          const result = await when(E(evaluator).evaluate(stringToEval));
          console.info('evaluator replied with', result);
          zcfSeat.exit();
        }, 'evaluate string');
      },
    },
  );

  const creatorFacet = zone.exo(
    'Evaluator Creator Facet',
    M.interface('Evaluator Creator Facet', {
      makeEvaluatorInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeEvaluatorInvitation() {
        const invitationMakers = makeInvitationMakers(privateArgs.evaluator);
        return zcf.makeInvitation(
          /** @type {OfferHandler} */
          _zcfSeat => {
            return harden({ invitationMakers });
          },
          'evaluator',
        );
      },
    },
  );

  return { creatorFacet };
};

/** @typedef {typeof start} AgoricEvaluatorSF */
