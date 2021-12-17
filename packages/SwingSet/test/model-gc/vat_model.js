import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

function createPromiseParts() {

  let res;
  let rej;

  let promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  return { promise, res, rej }
}

export function buildRootObject(_vatPowers) {

  let { scriptGetter } = _vatPowers

  let selfRef = null
  let selfName = null
  let items = new Map()

  return Far('root', {

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    /* Special methods only supposed to called by self or bootstrapper */
    async init(ref, name) {
      console.log(`[${name}] init`);
      selfRef = ref
      selfName = name
    },

    async meNextTransition() {

      if (!scriptGetter.notExhaustedAndNextActorMatch(selfName)) {
        return
      }

      const t = scriptGetter.nextTransition()
      assert(t.actor === selfName)
      console.log(`[${selfName}] exec`, t);

      for (const { read, write } of t.awaits) {
        const promise = items.get(read)
        console.log(`[${selfName}] read promise `, promise);
        const newValue = await promise
        console.log(`[${selfName}] write newValue `, newValue);
        items.set(write, newValue)
      }

      if (t.type === "sendItem") {
        await this.meSendItem(t.targetVatId, t.itemId)
      }
      else if (t.type === "storeSelfRef") {
        await this.meStoreSelfRef(t.itemId)
      }
      else if (t.type === "dropItem") {
        await this.meDropItem(t.itemId)
      }
      else if (t.type === "storePromise") {
        await this.meStorePromise(t.promiseId, t.resolverId)
      }
      else if (t.type === "resolve") {
        await this.meResolve(t.resolveItemId, t.resolverId)
      }
      else {
        console.log("UNKNOWN ACTION.")
        assert(false)
      }

      await this.meNextTransition()
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    /* Called on reading next scripted command */

    async meSendItem(targetVatId, itemId) {
      const v = items.get(targetVatId)
      const item = items.get(itemId)
      console.log(`[${selfName}] send item ${item} with id ${itemId} to ${v}`);
      await E(v).sendItem(itemId, item)
    },

    async meStoreSelfRef(itemId) {
      console.log(`[${selfName}] store selfRef at id ${itemId}`);
      items.set(itemId, selfRef)
    },

    async meDropItem(itemId) {
      console.log(`[${selfName}] drop ids ${itemId}`);
      items.delete(itemId)
    },

    async meStorePromise(promiseId, resolverId) {
      console.log(`[${selfName}] store resolver at id ${resolverId} and promise at id ${promiseId}`);
      const { promise, res } = createPromiseParts()
      items.set(promiseId, promise)
      items.set(resolverId, Far('', {
        fun: (resolveItem) => {
          console.log(`[${selfName}] execute resolver`);
          res(resolveItem)
        }
      }))
    },

    async meResolve(resolveItemId, resolverId) {
      const resolver = items.get(resolverId)
      const resolveItem = items.get(resolveItemId)
      console.log(`[${selfName}] resolve ${resolver} to item ${resolveItem}`);
      await E(resolver).fun(resolveItem)
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    /* Called by other vats */

    async transferControl() {
      await this.meNextTransition()
    },

    async sendItem(itemId, item) {
      console.log(`[${selfName}] receive item ${item} with id ${itemId}`);
      items.set(itemId, item)
    },

  });
}
