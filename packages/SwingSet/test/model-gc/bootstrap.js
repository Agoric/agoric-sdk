import { E } from '@agoric/eventual-send';
// import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
// import { assert, details as X } from '@agoric/assert';

/*
TODO: del this comment
# Command:

./bin/runner-alt --adversarialScriptFilename counterexample1.json --init\
 --memdb --config demo/aaAdversarial/swingset.json run demo/aaAdversarial;
*/

function getScript() {

  trace = {
    "init": [],
    "transitions": [
      {
        "type": "transferControl",
        "actor": "boot",
        "targetVat": "vt1"
      },
      {
        "type": "storeSelfRef",
        "actor": "vt1",
        "awaits": [],
        "itemId": 0
      },
      {
        "type": "storeSelfRef",
        "actor": "vt1",
        "awaits": [],
        "itemId": 1
      },
      {
        "type": "storeSelfRef",
        "actor": "vt1",
        "awaits": [],
        "itemId": 2
      },
      {
        "type": "transferControl",
        "actor": "boot",
        "awaits": [],
        "targetVat": "vt0"
      },
      {
        "type": "storeSelfRef",
        "actor": "vt0",
        "awaits": [],
        "itemId": 3
      },
      {
        "type": "transferControl",
        "actor": "boot",
        "awaits": [],
        "targetVat": "vt2"
      },
      {
        "type": "transferControl",
        "actor": "boot",
        "awaits": [],
        "targetVat": "vt0"
      },
      {
        "type": "transferControl",
        "actor": "boot",
        "awaits": [],
        "targetVat": "vt1"
      },
      {
        "type": "transferControl",
        "actor": "boot",
        "awaits": [],
        "targetVat": "vt2"
      }
    ],
    "actions": [
      "transferControl",
      "storeSelfRef",
      "storeSelfRef",
      "storeSelfRef",
      "transferControl",
      "storeSelfRef",
      "transferControl",
      "transferControl",
      "transferControl",
      "transferControl"
    ]
  }

  return { trace, name: "3n4u10_1" }

}

export function buildRootObject(_vatPowers) {

  const log = vatPowers.testLog;

  log(`bootstrap.js buildRootObject start`);

  let script;

  return Far('root', {

    async bootstrap(vats) {

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // Basic init info
      log('BOOTSTRAP method start');
      log('VAT LIST:', vats);

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // These steps don't relate to the object model (behind the scenes wiring only)
      script = getScript()

      log(`Boostrap.js running script:`);
      log(`script name: `, scriptGetter.getFilename());
      log(`script content: `, script);

      async function init() {

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // These steps don't relate to the object model (behind the scenes wiring only)

        const modelVatNames = [
          "vt0",
          "vt1",
          "vt2"
        ]

        for (const it of modelVatNames) {
          const ref = vats[it]
          const name = it
          await E(vats[it]).init(ref, name)
        }

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // These steps relate to the object model

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

      await init()

      while (scriptGetter.notExhaustedAndNextActorMatch("boot")) {

        let transition = scriptGetter.nextTransition()
        assert(transition.type == "transferControl")

        try {
          const v = transition.targetVat
          await E(vats[v]).transferControl()
        } catch (error) {
          log(`error (bootstrap): `, error);
        }
      }

      log(`Bootstrap Done.`);

    }
  })
}
