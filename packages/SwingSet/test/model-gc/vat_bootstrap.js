import { E } from '@agoric/eventual-send';
// import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
// import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {

  const log = vatPowers.testLog;

  log(`vat_bootstrap.js buildRootObject start`);

  let traces = vatParameters.traces;

  let transitionIx = 0;

  let trace = undefined;

  return Far('root', {

    async bootstrap(vats) {

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // Basic init info
      log('BOOTSTRAP method start');
      log('VAT LIST:', vats);

      log(`vat_boostrap.js running:`);

      async function init() {

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // These steps initialize vats

        const modelVatNames = [
          "vt0",
          "vt1",
          "vt2"
        ]

        for (const it of modelVatNames) {
          const ref = vats[it]
          const name = it
          await E(vats[it]).init(ref, name, trace.transitions)
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // These steps set up the object model

        const createVatRefCmds = trace.init.filter(({ type }) => type === "initCreateVatRef")
        const giveItemCmds = trace.init.filter(({ type }) => type === "initGiveItem")

        let tempStore = {}
        for (const { vat, itemId } of createVatRefCmds) {
          tempStore[itemId] = vats[vat]
        }

        for (const { vat, itemId } of giveItemCmds) {
          await E(vats[vat]).sendItem(itemId, tempStore[itemId])
        }

      }

      for (const t of traces) {

        trace = t;
        transitionIx = 0;

        await init()

        while (transitionIx < trace.transitions.length) {
          let transition = trace.transitions[transitionIx];
          transitionIx++;
          if (transition.actor == "boot") {
            assert(transition.type == "transferControl")
            try {
              const v = transition.targetVat
              await E(vats[v]).transferControl()
            } catch (error) {
              log(`error (bootstrap): `, error);
            }
          }
        }

        log(`[vat_bootstrap trace complete]`);

      }

    }
  })
}
