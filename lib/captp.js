// This logic was mostly lifted from @agoric/swingset-vat liveSlots.js
// Defects in it are mfig's fault.
import { makeMarshal, QCLASS } from '@agoric/marshal';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { HandledPromise } from '@agoric/eventual-send';

export default function makeCapTP(ourId, send, bootstrapObj = undefined) {
  const { serialize, unserialize } = makeMarshal(
    // eslint-disable-next-line no-use-before-define
    serializeSlot,
    // eslint-disable-next-line no-use-before-define
    unserializeSlot,
  );

  let lastPromiseID = 0;
  let lastExportID = 0;
  let lastQuestionID = 0;

  const valToSlot = new WeakMap();
  const slotToVal = new Map(); // exports, answers
  const questions = new Map(); // chosen by us
  const imports = new Map(); // chosen by our peer

  function serializeSlot(val, slots, slotMap) {
    if (!slotMap.has(val)) {
      let slot;
      if (!valToSlot.has(val)) {
        // new export
        if (Promise.resolve(val) === val) {
          lastPromiseID += 1;
          slot = `p${lastPromiseID}`;
          val.then(
            res =>
              send({
                type: 'CTP_RESOLVE',
                promiseID: lastPromiseID,
                res: serialize(harden(res)),
              }),
            rej =>
              send({
                type: 'CTP_RESOLVE',
                promiseID: lastPromiseID,
                rej: serialize(harden(rej)),
              }),
          );
        } else {
          lastExportID += 1;
          const exportID = lastExportID;
          slot = `o${exportID}`;
        }
        valToSlot.set(val, slot);
        slotToVal.set(slot, val);
      }

      slot = valToSlot.get(val);
      const slotIndex = slots.length;
      slots.push(slot);
      slotMap.set(val, slotIndex);
    }

    const slotIndex = slotMap.get(val);
    return harden({
      [QCLASS]: 'slot',
      index: slotIndex,
    });
  }

  function unserializeSlot(data, slots) {
    const slot = slots[Nat(data.index)];
    let val;
    if (!slotToVal.has(slot)) {
      // Make a new handled promise for the slot.
      const handler = {
        POST(_o, prop, args) {
          // Support: o~.[prop](...args) remote method invocation
          const pr = {};
          pr.p = new Promise((resolve, reject) => {
            pr.res = resolve;
            pr.rej = reject;
          });
          lastQuestionID += 1;
          questions.set(lastQuestionID, pr);
          send({
            type: 'CTP_CALL',
            questionID: lastQuestionID,
            target: slot,
            method: serialize(harden([prop, args])),
          });
          return harden(pr.p);
        },
      };

      const pr = {};
      pr.p = Promise.makeHandled((res, rej, resolveWithPresence) => {
        pr.rej = rej;
        pr.resPres = () => resolveWithPresence(handler);
        pr.res = res;
      }, handler);
      harden(pr);

      if (slot[0] === 'o') {
        // A new presence
        const presence = pr.resPres();
        presence.toString = () => `[Presence ${ourId} ${slot}]`;
        harden(presence);
        val = presence;
      } else {
        // A new promise
        imports.set(Number(slot.slice(1)), pr);
        val = pr.p;
      }
      slotToVal.set(slot, val);
      valToSlot.set(val, slot);
    }
    return slotToVal.get(slot);
  }

  const handler = {
    CTP_BOOTSTRAP(obj) {
      const { questionID } = obj;
      const bootstrap =
        typeof bootstrapObj === 'function' ? bootstrapObj() : bootstrapObj;
      // console.log('sending bootstrap', bootstrap);
      send({
        type: 'CTP_RETURN',
        answerID: questionID,
        result: serialize(bootstrap),
      });
    },
    CTP_CALL(obj) {
      const { questionID, target } = obj;
      const [prop, args] = unserialize(obj.method);
      const val = unserialize({
        body: JSON.stringify({
          [QCLASS]: 'slot',
          index: 0,
        }),
        slots: [target],
      });
      HandledPromise.applyMethod(val, prop, args)
        .then(res =>
          send({
            type: 'CTP_RETURN',
            answerID: questionID,
            result: serialize(harden(res)),
          }),
        )
        .catch(rej =>
          send({
            type: 'CTP_RETURN',
            answerID: questionID,
            exception: serialize(harden(rej)),
          }),
        );
    },
    CTP_RETURN(obj) {
      const { result, exception, answerID } = obj;
      const pr = questions.get(answerID);
      if ('exception' in obj) {
        pr.rej(unserialize(exception));
      } else {
        pr.res(unserialize(result));
      }
      questions.delete(answerID);
    },
    CTP_RESOLVE(obj) {
      const { promiseID, res, rej } = obj;
      const pr = imports.get(promiseID);
      if ('rej' in obj) {
        pr.rej(unserialize(rej));
      } else {
        pr.res(unserialize(res));
      }
      imports.delete(promiseID);
    },
  };

  // Get a reference to the other side's bootstrap object.
  const getBootstrap = () => {
    const pr = {};
    pr.p = new Promise((resolve, reject) => {
      pr.res = resolve;
      pr.rej = reject;
    });
    lastQuestionID += 1;
    questions.set(lastQuestionID, pr);
    send({
      type: 'CTP_BOOTSTRAP',
      questionID: lastQuestionID,
    });
    return harden(pr.p);
  };
  return [handler, getBootstrap];
}
