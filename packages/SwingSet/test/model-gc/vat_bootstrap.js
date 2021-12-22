import { E } from '@agoric/eventual-send';
// import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
// import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {

  const log = vatPowers.testLog;

  log(`vat_bootstrap.js buildRootObject start`);

  let traces = vatParameters.traces;

  let script = undefined;
  let transitions = undefined;

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
          await E(vats[it]).init(ref, name, script.transitions)
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // These steps set up the object model

        const createVatRefCmds = script.init.filter(({ type }) => type === "initCreateVatRef")
        const giveItemCmds = script.init.filter(({ type }) => type === "initGiveItem")

        let tempStore = {}
        for (const { vat, itemId } of createVatRefCmds) {
          tempStore[itemId] = vats[vat]
        }

        for (const { vat, itemId } of giveItemCmds) {
          await E(vats[vat]).sendItem(itemId, tempStore[itemId])
        }

      }

      for (const t of traces) {

        log(`[TRACE:${t.name}:${t.num}]`)
        script = t.script;
        transitions = script.transitions.filter(it => it.actor == "boot")

        await init()

        for (const transition of transitions) {
          try {
            const v = transition.targetVat
            log(`[boot] transferControl ${v}`)
            await E(vats[v]).transferControl()
          } catch (error) {
            log(`error (bootstrap): `, error);
          }
        }

        log(`[vat_bootstrap script complete]`);

      }

    }
  })
}
