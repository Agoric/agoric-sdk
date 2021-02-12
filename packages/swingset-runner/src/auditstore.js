import { assert, details as X } from '@agoric/assert';

/* eslint-disable no-use-before-define */
export function auditRefCounts(store) {
  const refCounts = new Map();
  const refSites = new Map();

  const vatNextID = Number(store.get('vat.nextID'));
  for (let vn = 1; vn < vatNextID; vn += 1) {
    const v = `v${vn}`;
    for (const key of store.getKeys(`${v}.c.kp`, `${v}.c.kp~`)) {
      const val = store.get(key);
      incRefCount(store.get(`${v}.c.${val}`), `clist.${v}`);
    }
  }

  const runQueue = JSON.parse(store.get('runQueue'));
  let msgNum = 0;
  for (const msg of runQueue) {
    refCountMsg(msg, `runQueue[${msgNum}]`);
    msgNum += 1;
  }

  const topID = Number(store.get('kp.nextID'));
  for (let idx = 1; idx < topID; idx += 1) {
    const kpid = `kp${idx}`;
    const state = store.get(`${kpid}.state`);

    switch (state) {
      case undefined:
        break;
      case 'unresolved': {
        const queueTop = store.get(`${kpid}.queue.nextID`);
        for (let qidx = 0; qidx < queueTop; qidx += 1) {
          const msg = store.get(`${kpid}.queue.${qidx}`);
          refCountMsg(JSON.parse(msg), `${kpid}.queue.${qidx}`);
        }
        break;
      }
      case 'fulfilledToPresence':
        incRefCount(store.get(`${kpid}.slot`), `${kpid}.slot`);
        break;
      case 'fulfilledToData':
      case 'rejected': {
        let slotNum = 0;
        for (const slot of commaSplit(store.get(`${kpid}.data.slots`))) {
          incRefCount(slot, `${kpid}.data.slots[${slotNum}]`);
          slotNum += 1;
        }
        break;
      }
      default:
        assert.fail(X`unknown state for ${kpid}: ${state}`);
    }
  }

  for (const kpid of refCounts.keys()) {
    const stored = store.get(`${kpid}.refCount`);
    const computed = `${refCounts.get(kpid)}`;
    if (stored !== computed) {
      console.log(
        `refCount mismatch ${kpid} stored=${stored} computed=${computed}`,
      );
      for (const site of refSites.get(kpid)) {
        console.log(`    ${site}`);
      }
    }
  }

  function refCountMsg(msg, site) {
    if (msg.type === 'notify') {
      incRefCount(msg.kpid, `${site}.kpid`);
    } else if (msg.type === 'send') {
      incRefCount(msg.target, `${site}.target`);
      incRefCount(msg.msg.result, `${site}.result`);
      let slotNum = 0;
      for (const slot of msg.msg.args.slots) {
        incRefCount(slot, `${site}.slots[${slotNum}]`);
        slotNum += 1;
      }
    } else {
      assert.fail(X`unknown message type ${msg.type}`);
    }
  }

  function incRefCount(kpid, site) {
    if (kpid && kpid.startsWith('kp')) {
      let refCount = refCounts.get(kpid);
      if (refCount) {
        refCount += 1;
        refSites.get(kpid).push(site);
      } else {
        refCount = 1;
        refSites.set(kpid, [site]);
      }
      refCounts.set(kpid, refCount);
    }
  }

  function commaSplit(s) {
    if (s === '') {
      return [];
    }
    return s.split(',');
  }
}
