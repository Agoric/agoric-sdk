import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

/*
# Command:

./bin/runner-alt --adversarialScriptFilename counterexample1.json --init\
 --memdb --config demo/aaAdversarial/swingset.json run demo/aaAdversarial;
*/

console.log('READING/LOADING bootstrap.js');

export function buildRootObject(_vatPowers) {

  console.log(`bootstrap.js buildRootObject start`);

  let { scriptGetter } = _vatPowers

  let script;

  return Far('root', {

    async bootstrap(vats) {

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // Basic init info
      console.log('BOOTSTRAP method start');
      console.log('VAT LIST:', vats);

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // These steps don't relate to the object model (behind the scenes wiring only)
      script = scriptGetter.getScript()

      console.log(`Boostrap.js running script:`);
      console.log(`script name: `, scriptGetter.getFilename());
      console.log(`script content: `, script);

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
          console.log(`error (bootstrap): `, error);
        }
      }

      console.log(`Bootstrap Done.`);

    }
  })
}
