import { Fail } from '@endo/errors';
import { parseReachableAndVatSlot } from '@agoric/swingset-vat/src/kernel/state/reachable.js';
import { parseVatSlot } from '@agoric/swingset-vat/src/lib/parseVatSlots.js';

/* eslint-disable no-use-before-define */
export function auditRefCounts(store, doDump, printPrefix) {
  const refCounts = new Map();
  const refSites = new Map();

  const vatNextID = Number(store.get('vat.nextID'));
  for (let vn = 1; vn < vatNextID; vn += 1) {
    const v = `v${vn}`;
    for (const key of store.getKeys(`${v}.c.kp`, `${v}.c.kp~`)) {
      const val = store.get(key);
      incRefCount(store.get(`${v}.c.${val}`), `clist.${v}`);
    }
    for (const key of store.getKeys(`${v}.c.ko`, `${v}.c.ko~`)) {
      const val = store.get(key);
      const { isReachable, vatSlot } = parseReachableAndVatSlot(val);
      const { allocatedByVat } = parseVatSlot(vatSlot);
      const tag = isReachable ? 'R' : '_';
      if (!allocatedByVat) {
        incRefCount(
          store.get(`${v}.c.${vatSlot}`),
          `clist.${v}.${tag}`,
          !isReachable,
        );
      }
    }
  }

  const pinnedObjects = commaSplit(store.get('pinnedObjects'));
  for (const pinned of pinnedObjects) {
    incRefCount(pinned, 'pin');
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
      case 'fulfilled':
      case 'rejected': {
        let slotNum = 0;
        for (const slot of commaSplit(store.get(`${kpid}.data.slots`))) {
          incRefCount(slot, `${kpid}.data.slots[${slotNum}]`);
          slotNum += 1;
        }
        break;
      }
      default:
        Fail`unknown state for ${kpid}: ${state}`;
    }
  }

  for (const kref of Array.from(refCounts.keys()).sort()) {
    let storedReach;
    let storedRecog;
    const [computedReach, computedRecog] = refCounts.get(kref);
    if (kref.startsWith('kp')) {
      storedReach = Number(store.get(`${kref}.refCount`));
      storedRecog = storedReach;
    } else {
      [storedReach, storedRecog] = commaSplit(
        store.get(`${kref}.refCount`),
      ).map(Number);
    }
    let dumpIt = false;
    if (storedReach !== computedReach || storedRecog !== computedRecog) {
      if (printPrefix) {
        console.log('\nRefCount audit failures:');
        printPrefix = false;
      }
      console.log(
        `refCount mismatch ${kref} stored=${storedReach},${storedRecog} computed=${computedReach},${computedRecog}`,
      );
      dumpIt = true;
    } else if (doDump) {
      if (printPrefix) {
        console.log('\nRefCount dump:');
        printPrefix = false;
      }
      console.log(`refCount ${kref} ${storedReach},${storedRecog}`);
      dumpIt = true;
    }
    if (dumpIt) {
      for (const site of refSites.get(kref)) {
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
      Fail`unknown message type ${msg.type}`;
    }
  }

  function incRefCount(kref, site, reachableOnly) {
    if (kref && (kref.startsWith('kp') || kref.startsWith('ko'))) {
      let refCount = refCounts.get(kref);
      if (refCount) {
        refCount[1] += 1;
        if (!reachableOnly) {
          refCount[0] += 1;
        }
        refSites.get(kref).push(site);
      } else {
        if (reachableOnly) {
          refCount = [0, 1];
        } else {
          refCount = [1, 1];
        }
        refSites.set(kref, [site]);
      }
      refCounts.set(kref, refCount);
    }
  }

  function commaSplit(s) {
    if (s === '') {
      return [];
    }
    return s.split(',');
  }
}
