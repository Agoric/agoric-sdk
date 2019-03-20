import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { makeLiveSlots } from './liveSlots';
import { QCLASS, makeMarshal } from './marshal';

export default function buildKernel(kernelEndowments) {
  const { setImmediate } = kernelEndowments;

  const log = [];

  let running = false;

  // 'slot' is the neutral coordinate, and is one of:
  // * { type: 'export', vatID, slotID }
  // * { type: 'promise', promiseID }

  // key = `${type}.${toVatID}.${slotID}`
  // vats[vatid] = { imports: { inbound[key] = importID,
  //                            outbound[importID] = slot, },
  //                 nextImportID,
  //                 promises: { inbound[kernelPromiseID] = id,
  //                             outbound[id] = kernelPromiseID, },
  //                 nextPromiseID,
  //                 resolvers: { inbound[kernelPromiseID] = id,
  //                              outbound[id] = kernelPromiseID, },
  //                 nextResolverID,
  //               }
  const vats = harden(new Map());

  // runQueue entries are {vatID, facetID, method, argsString, slots}
  const runQueue = [];

  // in the kernel table, promises and resolvers are both indexed by the same
  // value. kernelPromises[promiseID] = { decider, subscribers }
  const kernelPromises = harden(new Map());
  let nextPromiseIndex = 1;

  function getVat(vatID) {
    const vat = vats.get(vatID);
    if (vat === undefined) {
      throw new Error(`unknown vatID '${vatID}'`);
    }
    return vat;
  }

  function allocateKernelPromiseIndex() {
    const i = nextPromiseIndex;
    nextPromiseIndex += 1;
    return i;
  }

  function allocatePromiseIDForVat(vat) {
    const i = vat.nextPromiseID;
    vat.nextPromiseID += 1;
    return i;
  }

  function allocateResolverIDForVat(vat) {
    const i = vat.nextResolverID;
    vat.nextResolverID += 1;
    return i;
  }

  // we define three types of slot identifiers: inbound, neutral, outbound
  // * outbound is what syscall.send(slots=) contains, it is always scoped to
  //   the sending vat, and the values are {type, id}. 'type' is either
  //   'import' ("my import") or 'export'. Message targets are always imports.
  // * middle is stored in runQueue, and contains {type: export, vatID, slotID}
  // * inbound is passed into deliver(slots=), is always scoped to the
  //   receiving/target vat, and the values are {type, id} where 'type' is
  //   either 'export' (for arguments coming back home) or 'import' for
  //   arguments from other vats
  //
  // * To convert outbound->middle, we look up imports in kernelSlots, and
  //   just append the sending vatID to exports
  //
  // * To convert middle->inbound, we set attach type='export' when the vatID
  //   matches that of the receiving vat, and we look up the others in
  //   kernelSlots (adding one if necessary) to deliver type='import'

  function mapOutbound(fromVatID, what) {
    // fromVatID just did syscall.send and referenced 'slotID' (in an argument,
    // or as the target of a send), what { vatID, what } are they talking
    // about?
    // console.log(`mapOutbound ${JSON.stringify(what)}`);
    const vat = getVat(fromVatID);

    if (what.type === 'export') {
      // one of fromVatID's exports, which doesn't need translation into the
      // neutral { vatID, slotID } format.
      Nat(what.slotID);
      return { type: 'export', vatID: fromVatID, slotID: what.slotID };
    }

    if (what.type === 'import') {
      // an import from somewhere else, so translate it into the neutral
      // non-Vat-specific form
      Nat(what.slotID);
      return vat.imports.outbound.get(what.slotID);
    }

    throw Error(`unknown what.type '${what.type}'`);
  }

  function allocateImportIndex(vatID) {
    const vat = getVat(vatID);
    const i = vat.nextImportID;
    vat.nextImportID = i + 1;
    return i;
  }

  // decide what to give 'forVatID', either one of their existing exports
  // (type: export) or an existing/new import
  function mapInbound(forVatID, what) {
    // console.log(`mapInbound for ${forVatID} of ${what}`);
    const vat = getVat(forVatID);

    if (what.type === 'export') {
      const { vatID, slotID } = what;
      Nat(slotID);

      if (vatID === forVatID) {
        // this is returning home, so it's one of the target's exports
        return { type: 'export', slotID };
      }

      const m = vat.imports;
      const key = `${what.type}.${vatID}.${slotID}`; // ugh javascript
      if (!m.inbound.has(key)) {
        // must add both directions
        const newSlotID = Nat(allocateImportIndex(forVatID));
        // console.log(` adding ${newSlotID}`);
        m.inbound.set(key, newSlotID);
        m.outbound.set(newSlotID, harden({ type: 'export', vatID, slotID }));
      }
      return { type: 'import', slotID: m.inbound.get(key) };
    }

    if (what.type === 'promise') {
      const kernelPromiseID = what.promiseID;
      Nat(kernelPromiseID);
      const m = vat.promises;
      if (!m.inbound.has(kernelPromiseID)) {
        const promiseID = Nat(allocatePromiseIDForVat(vat));
        m.inbound.set(kernelPromiseID, promiseID);
        m.outbound.set(promiseID, kernelPromiseID);
      }
      return { type: 'promise', promiseID: m.inbound.get(kernelPromiseID) };
    }

    if (what.type === 'resolver') {
      const kernelPromiseID = what.promiseID;
      Nat(kernelPromiseID);
      const m = vat.resolvers;
      if (!m.inbound.has(kernelPromiseID)) {
        const resolverID = Nat(allocateResolverIDForVat(vat));
        m.inbound.set(kernelPromiseID, resolverID);
        m.outbound.set(resolverID, kernelPromiseID);
      }
      return { type: 'resolver', resolverID: m.inbound.get(kernelPromiseID) };
    }

    throw Error(`unknown type '${what.type}'`);
  }

  const syscallBase = harden({
    send(fromVatID, targetSlot, method, argsString, vatSlots) {
      Nat(targetSlot);
      const target = mapOutbound(fromVatID, {
        type: 'import',
        slotID: targetSlot,
      });
      if (!target)
        throw Error(`unable to find target for ${fromVatID}/${targetSlot}`);
      const slots = vatSlots.map(what => mapOutbound(fromVatID, what));
      runQueue.push({
        vatID: target.vatID,
        facetID: target.slotID,
        method,
        argsString,
        slots,
      });
    },

    createPromise(fromVatID) {
      const promiseID = allocateKernelPromiseIndex();
      // we don't harden the kernel promise record because it is mutable: it
      // can be replaced when syscall.redirect/fulfill/reject is called
      kernelPromises.set(promiseID, { decider: fromVatID, subscribers: [] });
      const p = mapInbound(fromVatID, {
        type: 'promise',
        promiseID,
      });
      const r = mapInbound(fromVatID, {
        type: 'resolver',
        promiseID,
      });
      return { promiseID: p.promiseID, resolverID: r.resolverID };
    },
  });

  function syscallForVatID(fromVatID) {
    return harden({
      send(...args) {
        return syscallBase.send(fromVatID, ...args);
      },
      createPromise(...args) {
        return syscallBase.createPromise(fromVatID, ...args);
      },

      log(str) {
        log.push(`${str}`);
      },

      // TODO: this is temporary, obviously vats shouldn't be able to pause the kernel
      pause() {
        running = false;
      },
    });
    // TODO: since we pass this in on each deliver() call, consider
    // destroying this object after each delivery, to discourage vat code
    // from retaining it. OTOH if we don't expect to ever change it, that's
    // wasteful and limiting.
  }

  function addVat(vatID, setup) {
    if (vats.has(vatID)) {
      throw new Error(`already have a vat named '${vatID}'`);
    }
    const syscall = syscallForVatID(vatID);
    const helpers = harden({
      vatID,
      makeLiveSlots,
      log(str) {
        log.push(`${str}`);
      },
    });
    const dispatch = setup(syscall, helpers);
    // the vat record is not hardened: it holds mutable next-ID values
    vats.set(vatID, {
      id: vatID,
      dispatch,
      imports: harden({
        outbound: new Map(),
        inbound: new Map(),
      }),
      nextImportID: 1,
      promises: harden({
        outbound: new Map(),
        inbound: new Map(),
      }),
      nextPromiseID: 1,
      resolvers: harden({
        outbound: new Map(),
        inbound: new Map(),
      }),
      nextResolverID: 1,
    });
  }

  async function deliverOneMessage(message) {
    const targetVatID = message.vatID;
    const { dispatch } = getVat(targetVatID);
    // console.log(`deliver mapping ${JSON.stringify(message)}`);
    const inputSlots = message.slots.map(what => mapInbound(targetVatID, what));

    // the delivery might cause some number of (native) Promises to be
    // created and resolved, so we use the IO queue to detect when the
    // Promise queue is empty. The IO queue (setImmediate and setTimeout) is
    // lower-priority than the Promise queue on browsers and Node 11, but on
    // Node 10 it is higher. So this trick requires Node 11.
    // https://jsblog.insiderattack.net/new-changes-to-timers-and-microtasks-from-node-v11-0-0-and-above-68d112743eb3

    let r;
    const queueEmptyP = new Promise(res => (r = res));
    setImmediate(() => r());

    // protect dispatch with promise/then
    Promise.resolve()
      .then(() => {
        dispatch.deliver(
          message.facetID,
          message.method,
          message.argsString,
          inputSlots,
        );
      })
      .then(undefined, err => {
        console.log(
          `vat[${targetVatID}][${message.facetID}].${
            message.method
          } dispatch failed: ${err}`,
          err,
        );
      });

    await queueEmptyP;
  }

  function addImport(forVatID, what) {
    return mapInbound(forVatID, what);
  }

  function mapQueueSlotToKernelRealm(s) {
    if (s.type === 'export') {
      return harden({
        type: `${s.type}`,
        vatID: `${s.vatID}`,
        slotID: Nat(s.slotID),
      });
    }
    throw Error(`unrecognized type '${s.type}'`);
  }

  function queue(vatID, facetID, method, argsString, slots = []) {
    // queue a message on the end of the queue, with 'neutral' slotIDs. Use
    // 'step' or 'run' to execute it
    runQueue.push(
      harden({
        vatID: `${vatID}`,
        facetID: Nat(facetID), // always export/positive
        method: `${method}`,
        argsString: `${argsString}`,
        // queue() is exposed to the controller's realm, so we must translate
        // each slot into a kernel-realm object/array
        slots: Array.from(slots.map(mapQueueSlotToKernelRealm)),
      }),
    );
  }

  function callBootstrap(vatID, argvString) {
    const argv = JSON.parse(`${argvString}`);
    // each key of 'vats' will be serialized as a reference to its obj0
    const vrefs = new Map();
    const vatObj0s = {};
    Array.from(vats.entries()).forEach(e => {
      const targetVatID = e[0];
      if (targetVatID !== vatID) {
        // don't give _bootstrap to itself
        const vref = harden({}); // marker
        vatObj0s[targetVatID] = vref;
        vrefs.set(vref, { type: 'export', vatID: targetVatID, slotID: 0 });
      }
    });

    function serializeSlot(vref, slots, slotMap) {
      if (!vrefs.has(vref)) {
        console.log(`oops ${vref}`, vref);
        throw Error('bootstrap got unexpected pass-by-presence');
      }
      if (!slotMap.has(vref)) {
        const slotIndex = slots.length;
        slots.push(vrefs.get(vref));
        slotMap.set(vref, slotIndex);
      }
      const slotIndex = slotMap.get(vref);
      return harden({ [QCLASS]: 'slot', index: slotIndex });
    }
    const m = makeMarshal(serializeSlot);
    const s = m.serialize(harden({ args: [argv, vatObj0s] }));
    // queue() takes 'neutral' { type: export, vatID, slotID } objects in s.slots
    queue(vatID, 0, 'bootstrap', s.argsString, s.slots);
  }

  const kernel = harden({
    addVat(vatID, setup) {
      harden(setup);
      // 'setup' must be an in-realm function. This test guards against
      // accidents, but not against malice. MarkM thinks there is no reliable
      // way to test this.
      if (!(setup instanceof Function)) {
        throw Error('setup is not an in-realm function');
      }
      addVat(`${vatID}`, setup);
    },

    callBootstrap,

    addImport,

    log(str) {
      log.push(`${str}`);
    },

    dump() {
      const vatTables = [];
      const kernelTable = [];

      vats.forEach((vat, vatID) => {
        // TODO: find some way to expose the liveSlots internal tables, the
        // kernel doesn't see them
        const vatTable = { vatID };
        vatTables.push(vatTable);

        vat.imports.outbound.forEach((target, slotID) => {
          kernelTable.push([
            vatID,
            'import',
            slotID,
            target.type,
            target.vatID,
            target.slotID,
          ]);
        });

        vat.promises.outbound.forEach((kernelPromiseID, promiseID) => {
          kernelTable.push([vatID, 'promise', promiseID, kernelPromiseID]);
        });
      });

      function compareNumbers(a, b) {
        return a - b;
      }

      function compareStrings(a, b) {
        if (a > b) {
          return 1;
        }
        if (a < b) {
          return -1;
        }
        return 0;
      }

      kernelTable.sort(
        (a, b) =>
          compareStrings(a[0], b[0]) ||
          compareStrings(a[1], b[1]) ||
          compareNumbers(a[2], b[2]) ||
          compareStrings(a[3], b[3]) ||
          compareNumbers(a[4], b[4]) ||
          compareNumbers(a[5], b[5]) ||
          0,
      );

      return { vatTables, kernelTable, runQueue, log };
    },

    async run() {
      // process all messages, until syscall.pause() is invoked
      running = true;
      while (running && runQueue.length) {
        // eslint-disable-next-line no-await-in-loop
        await deliverOneMessage(runQueue.shift());
      }
    },

    async drain() {
      // process all existing messages, but stop before processing new ones
      running = true;
      let remaining = runQueue.length;
      while (running && remaining) {
        // eslint-disable-next-line no-await-in-loop
        await deliverOneMessage(runQueue.shift());
        remaining -= 1;
      }
    },

    async step() {
      // process a single message
      if (runQueue.length) {
        await deliverOneMessage(runQueue.shift());
      }
    },

    queue,
  });

  return kernel;
}
