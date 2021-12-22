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

export function buildRootObject(vatPowers) {

  const log = vatPowers.testLog;

  let selfRef = undefined
  let selfName = undefined
  let items = undefined
  let transitions = undefined;
  let transitionIx = undefined;

  return Far('root', {

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    /* Special methods only supposed to called by self or bootstrapper */
    async init(_selfRef, _selfName, _transitions) {
      log(`[${_selfName}] init`);
      selfRef = _selfRef
      selfName = _selfName
      transitions = _transitions
      transitionIx = 0

      // Allows items from previous runs to be garbage collected
      items = new Map()
    },

    async meNextTransition() {

      while (transitionIx < transitions.length && transitions[transitionIx].actor != selfName) {
        transitionIx++;
      }
      if (transitions.length <= transitionIx) {
        return;
      }

      const t = transitions[transitionIx];
      transitionIx++;

      assert(t.actor === selfName)

      log(`[${selfName}](exec)`);

      for (const { read, write } of t.awaits) {
        const promise = items.get(read)
        log(`[${selfName}] read promise `, promise);
        const newValue = await promise
        log(`[${selfName}] write newValue `, newValue);
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
        log("UNKNOWN ACTION.")
        assert(false)
      }

      if (transitions.length <= transitionIx || transitions[transitionIx].actor == "boot") {
        // Relinquish control
        transitionIx++;
        return;
      }

      await this.meNextTransition()
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    /* Called on reading next scripted command */

    async meSendItem(targetVatId, itemId) {
      const v = items.get(targetVatId)
      const item = items.get(itemId)
      log(`[${selfName}] send item ${item} with id ${itemId} to ${v}`);
      await E(v).sendItem(itemId, item)
    },

    async meStoreSelfRef(itemId) {
      log(`[${selfName}] store selfRef at id ${itemId}`);
      items.set(itemId, selfRef)
    },

    async meDropItem(itemId) {
      log(`[${selfName}] drop ids ${itemId}`);
      items.delete(itemId)
    },

    async meStorePromise(promiseId, resolverId) {
      log(`[${selfName}] store resolver at id ${resolverId} and promise at id ${promiseId}`);
      const { promise, res } = createPromiseParts()
      items.set(promiseId, promise)
      items.set(resolverId, Far('', {
        fun: (resolveItem) => {
          log(`[${selfName}] execute resolver`);
          res(resolveItem)
        }
      }))
    },

    async meResolve(resolveItemId, resolverId) {
      const resolver = items.get(resolverId)
      const resolveItem = items.get(resolveItemId)
      log(`[${selfName}] resolve ${resolver} to item ${resolveItem}`);
      await E(resolver).fun(resolveItem)
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    /* Called by other vats */

    async transferControl() {
      await this.meNextTransition()
    },

    async sendItem(itemId, item) {
      log(`[${selfName}] receive item ${item} with id ${itemId}`);
      items.set(itemId, item)
    },

  });
}
