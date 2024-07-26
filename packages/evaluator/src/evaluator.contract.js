// @ts-check
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage';

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
    /**
     * @param {string} name
     * @param {object} powers
     * @param {ERef<import('@agoric/internal/src/lib-chainStorage').StorageNode>} powers.storageNode
     * @param {ERef<ReturnType<typeof import('@endo/marshal').makeMarshal>>} powers.marshaller
     * @param {any} powers.evaluator
     */
    (name, { storageNode, evaluator, marshaller }) => ({
      marshaller,
      name,
      storageNode,
      evaluator,
      lastSequence: 0n,
    }),
    {
      async Eval(stringToEval) {
        return zcf.makeInvitation(async zcfSeat => {
          const { name, evaluator, marshaller, storageNode } = this.state;
          this.state.lastSequence += 1n;
          const seq = this.state.lastSequence;
          await E(storageNode).setValue(
            JSON.stringify({ lastSequence: Number(seq) }),
          );
          let shortenedStringToEval = stringToEval.slice(0, 100);
          if (shortenedStringToEval !== stringToEval) {
            shortenedStringToEval += '...';
          }
          console.info(
            '@@@',
            name,
            `is evaluating ${seq}:`,
            shortenedStringToEval,
          );
          const subStorage = await makeStorageNodeChild(
            storageNode,
            `eval${seq}`,
          );

          const updateSubStorage = async obj => {
            harden(obj);
            const jsonableObj = await E(marshaller).toCapData(obj);
            await E(subStorage).setValue(JSON.stringify(jsonableObj));
          };

          const request = { seq, command: shortenedStringToEval };
          await updateSubStorage(request);

          let reply;
          try {
            const result = await when(E(evaluator).evaluate(stringToEval));
            reply = { ...request, result };
            console.info('@@@ evaluator returned', result);
          } catch (e) {
            reply = { ...request, error: e };
            console.info('@@@ evaluator failed with', e);
          }

          zcfSeat.exit();
          await updateSubStorage(reply);
          return harden({ reply });
        }, 'evaluate string');
      },
    },
  );

  const creatorFacet = zone.exo(
    'Evaluator Creator Facet',
    M.interface('Evaluator Creator Facet', {
      makeEvaluatorInvitation: M.callWhen(M.string()).returns(InvitationShape),
    }),
    {
      async makeEvaluatorInvitation(name) {
        console.log('@@@ making evaluator invitation for', name);
        const storageNode = await makeStorageNodeChild(
          privateArgs.storageNode,
          name,
        );
        await E(storageNode).setValue(JSON.stringify({ lastSequence: 0 }));
        console.log('@@@ making invitation makers for', name);
        const invitationMakers = makeInvitationMakers(name, {
          storageNode,
          marshaller: privateArgs.marshaller,
          evaluator: privateArgs.evaluator,
        });
        console.log('@@@ returning invitation');
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
