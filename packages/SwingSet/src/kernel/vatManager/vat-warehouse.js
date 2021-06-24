// @ts-check
import { assert, details as X, quote as q } from '@agoric/assert';
import { makeVatTranslators } from '../vatTranslator.js';

const { freeze } = Object;

/** @param { number } max */
export const makeLRU = max => {
  /** @type { string[] } */
  const items = [];

  return freeze({
    /** @param { string } item */
    add: item => {
      const pos = items.indexOf(item);
      // already most recently used
      if (pos + 1 === max) {
        return null;
      }
      // remove from former position
      if (pos >= 0) {
        items.splice(pos, 1);
      }
      items.push(item);
      // not yet full
      if (items.length <= max) {
        return null;
      }
      const [lru] = items.splice(0, 1);
      return lru;
    },

    get size() {
      return items.length;
    },

    /** @param { string } item */
    remove: item => {
      const pos = items.indexOf(item);
      if (pos >= 0) {
        items.splice(pos, 1);
      }
    },
  });
};

/**
 * @param { KernelKeeper } kernelKeeper
 * @param { ReturnType<typeof import('../loadVat.js').makeVatLoader> } vatLoader
 * @param {{ maxVatsOnline?: number, snapshotInterval?: number }=} policyOptions
 *
 * @typedef {(syscall: VatSyscallObject) => ['error', string] | ['ok', null] | ['ok', Capdata]} VatSyscallHandler
 * @typedef {{ body: string, slots: unknown[] }} Capdata
 * @typedef { [unknown, ...unknown[]] } Tagged
 * @typedef { { moduleFormat: string }} Bundle
 */
export function makeVatWarehouse(kernelKeeper, vatLoader, policyOptions) {
  const { maxVatsOnline = 50, snapshotInterval = 20 } = policyOptions || {};
  // console.debug('makeVatWarehouse', { policyOptions });

  /**
   * @typedef {{
   *   manager: VatManager,
   *   enablePipelining: boolean,
   *   options: { name?: string, description?: string, managerType?: ManagerType },
   * }} VatInfo
   * @typedef { ReturnType<typeof import('../vatTranslator').makeVatTranslators> } VatTranslators
   */
  const ephemeral = {
    /** @type {Map<string, VatInfo> } key is vatID */
    vats: new Map(),
  };

  /** @type {Map<string, VatTranslators> } */
  const xlate = new Map();
  /** @param { string } vatID */
  function provideTranslators(vatID) {
    let translators = xlate.get(vatID);
    if (!translators) {
      // NOTE: makeVatTranslators assumes
      // vatKeeper for this vatID is available.
      translators = makeVatTranslators(vatID, kernelKeeper);
      xlate.set(vatID, translators);
    }
    return translators;
  }

  /**
   * @param {string} vatID
   * @param {boolean} recreate
   * @returns { Promise<VatInfo> }
   */
  async function ensureVatOnline(vatID, recreate) {
    const info = ephemeral.vats.get(vatID);
    if (info) return info;

    assert(kernelKeeper.vatIsAlive(vatID), X`${q(vatID)}: not alive`);
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const { source, options } = vatKeeper.getSourceAndOptions();

    const translators = provideTranslators(vatID);

    const chooseLoader = () => {
      if (recreate) {
        const isDynamic = kernelKeeper.getDynamicVats().includes(vatID);
        if (isDynamic) {
          return vatLoader.recreateDynamicVat;
        } else {
          return vatLoader.recreateStaticVat;
        }
      } else {
        return vatLoader.createVatDynamically;
      }
    };
    const manager = await chooseLoader()(vatID, source, translators, options);

    // TODO(3218): persist this option; avoid spinning up a vat that isn't pipelined
    const { enablePipelining = false } = options;

    const lastSnapshot = vatKeeper.getLastSnapshot();
    const entriesReplayed = await manager.replayTranscript(
      lastSnapshot ? lastSnapshot.startPos : undefined,
    );

    const result = {
      manager,
      translators,
      enablePipelining,
      options,
    };
    console.log(
      vatID,
      'online:',
      options.managerType,
      options.description || '',
      'transcript entries replayed:',
      entriesReplayed,
    );
    ephemeral.vats.set(vatID, result);
    // eslint-disable-next-line no-use-before-define
    await applyAvailabilityPolicy(vatID);
    return result;
  }

  /**
   * Bring new dynamic vat online and run its (bootstrap) code.
   *
   * @param {string} vatID
   */
  async function createDynamicVat(vatID) {
    return ensureVatOnline(vatID, false);
  }

  /** @param { typeof console.log } logStartup */
  async function start(logStartup) {
    const recreate = true; // note: PANIC on failure to recreate

    // NOTE: OPTIMIZATION OPPORTUNITY: replay vats in parallel

    // instantiate all static vats
    for (const [name, vatID] of kernelKeeper.getStaticVats()) {
      logStartup(`provideVatKeeper for vat ${name} as vat ${vatID}`);
      // eslint-disable-next-line no-await-in-loop
      await ensureVatOnline(vatID, recreate);
    }

    // instantiate all dynamic vats
    for (const vatID of kernelKeeper.getDynamicVats()) {
      logStartup(`provideVatKeeper for dynamic vat ${vatID}`);
      // eslint-disable-next-line no-await-in-loop
      await ensureVatOnline(vatID, recreate);
    }
  }

  /**
   * @param { string } vatID
   * @returns {{ enablePipelining?: boolean }
   *  | undefined // if the vat is dead or never initialized
   * }
   */
  function lookup(vatID) {
    const liveInfo = ephemeral.vats.get(vatID);
    if (liveInfo) {
      const { enablePipelining } = liveInfo;
      return { enablePipelining };
    }
    if (!kernelKeeper.vatIsAlive(vatID)) {
      return undefined;
    }
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const { enablePipelining } = vatKeeper.getOptions();
    return { enablePipelining };
  }

  const recent = makeLRU(maxVatsOnline);

  /**
   *
   * does not modify the kernelDB
   *
   * @param {string} vatID
   * @param {boolean=} makeSnapshot
   * @returns { Promise<unknown> }
   */
  async function evict(vatID, makeSnapshot = false) {
    assert(!makeSnapshot, 'not implemented@@@');
    assert(lookup(vatID));

    recent.remove(vatID);

    const info = ephemeral.vats.get(vatID);
    if (!info) {
      // console.debug('evict: not online:', vatID);
      return undefined;
    }
    ephemeral.vats.delete(vatID);
    xlate.delete(vatID);
    kernelKeeper.closeVatTranscript(vatID);
    kernelKeeper.evictVatKeeper(vatID);

    // console.log('evict: shutting down', vatID);
    return info.manager.shutdown();
  }

  /**
   * Simple fixed-size LRU cache policy
   *
   * TODO: policy input: did a vat get a message? how long ago?
   * "important" vat option?
   * options: pay $/block to keep in RAM - advisory; not consensus
   * creation arg: # of vats to keep in RAM (LRU 10~50~100)
   *
   * @param {string} currentVatID
   */
  async function applyAvailabilityPolicy(currentVatID) {
    const lru = recent.add(currentVatID);
    if (!lru) {
      return;
    }
    // const {
    //   options: { description, managerType },
    // } = ephemeral.vats.get(lru) || assert.fail();
    // console.info('evict', lru, description, managerType, 'for', currentVatID);
    await evict(lru);
  }

  /** @type { string | undefined } */
  let lastVatID;

  /** @type {(vatID: string, d: VatDeliveryObject) => Promise<Tagged> } */
  async function deliverToVat(vatID, delivery) {
    await applyAvailabilityPolicy(vatID);
    lastVatID = vatID;

    const recreate = true; // PANIC in the failure case
    const { manager } = await ensureVatOnline(vatID, recreate);
    return manager.deliver(delivery);
  }

  /**
   * Save a snapshot of most recently used vat,
   * depending on snapshotInterval.
   */
  async function maybeSaveSnapshot() {
    if (!lastVatID || !lookup(lastVatID)) {
      return;
    }
    const recreate = true; // PANIC in the failure case
    const { manager } = await ensureVatOnline(lastVatID, recreate);
    const vatKeeper = kernelKeeper.provideVatKeeper(lastVatID);
    await vatKeeper.saveSnapshot(manager, snapshotInterval);
    lastVatID = undefined;
  }

  /**
   * @param {string} vatID
   * @param {unknown[]} kd
   * @returns { VatDeliveryObject }
   */
  function kernelDeliveryToVatDelivery(vatID, kd) {
    const translators = provideTranslators(vatID);

    // @ts-ignore TODO: types for kernelDeliveryToVatDelivery
    return translators.kernelDeliveryToVatDelivery(kd);
  }

  /**
   * @param {string} vatID
   * @param {unknown} setup
   * @param {ManagerOptions} creationOptions
   */
  async function loadTestVat(vatID, setup, creationOptions) {
    const manager = await vatLoader.loadTestVat(vatID, setup, creationOptions);

    const translators = provideTranslators(vatID);

    const { enablePipelining = false } = creationOptions;

    const result = {
      manager,
      translators,
      enablePipelining,
      options: {},
    };
    ephemeral.vats.set(vatID, result);
  }

  /**
   * @param {string} vatID
   * @returns { Promise<void> }
   */
  async function vatWasTerminated(vatID) {
    try {
      await evict(vatID, false);
    } catch (err) {
      console.debug('vat termination was already reported; ignoring:', err);
    }
  }

  // mostly used by tests, only needed with thread/process-based workers
  function shutdown() {
    const work = Array.from(ephemeral.vats.values(), ({ manager }) =>
      manager.shutdown(),
    );
    return Promise.all(work);
  }

  return harden({
    start,
    createDynamicVat,
    loadTestVat,
    lookup,
    kernelDeliveryToVatDelivery,
    deliverToVat,
    maybeSaveSnapshot,

    // mostly for testing?
    activeVatsInfo: () =>
      [...ephemeral.vats].map(([id, { options }]) => ({ id, options })),

    vatWasTerminated,
    shutdown,
  });
}
harden(makeVatWarehouse);
