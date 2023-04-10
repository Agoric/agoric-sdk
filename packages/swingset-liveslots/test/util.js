import { vstr } from './vat-util.js';
import { kser } from './kmarshal.js';

export { vstr };

/**
 * @param {(d: unknown) => void} [onDispatchCallback ]
 */
export function buildDispatch(onDispatchCallback) {
  const log = [];

  const GC = ['dropExports', 'retireExports', 'retireImports'];

  function dispatch(vatDeliverObject) {
    const [type, ...vdoargs] = vatDeliverObject;
    if (type === 'message') {
      const [target, msg] = vdoargs;
      const { methargs, result } = msg;
      const d = {
        type: 'deliver',
        targetSlot: target,
        methargs,
        resultSlot: result,
      };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    } else if (type === 'notify') {
      const [resolutions] = vdoargs;
      const d = { type: 'notify', resolutions };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    } else if (type === 'startVat') {
      // ignore
    } else if (GC.includes(type)) {
      const [vrefs] = vdoargs;
      log.push({ type, vrefs });
    } else {
      throw Error(`unknown vatDeliverObject type ${type}`);
    }
  }

  return { log, dispatch };
}

/**
 * @param {string} target
 * @param {string} method
 * @param {any[]} args
 * @param {string | null | undefined} result
 * @returns {import('../src/types.js').VatDeliveryMessage}
 */
export function makeMessage(target, method, args = [], result = null) {
  const methargs = kser([method, args]);
  const msg = { methargs, result };
  /** @type {import('../src/types.js').VatDeliveryMessage} */
  const vatDeliverObject = harden(['message', target, msg]);
  return vatDeliverObject;
}

/**
 * @param {import('../src/types.js').SwingSetCapData} vatParameters
 * @returns {import('../src/types.js').VatDeliveryStartVat}
 */
export function makeStartVat(vatParameters) {
  /** @type {import('../src/types.js').VatDeliveryStartVat} */
  return harden(['startVat', vatParameters]);
}

/**
 * @returns {import('../src/types.js').VatDeliveryBringOutYourDead}
 */
export function makeBringOutYourDead() {
  return harden(['bringOutYourDead']);
}

/**
 * @param {import('../src/types.js').VatOneResolution[]} resolutions
 * @returns {import('../src/types.js').VatDeliveryNotify}
 */
export function makeResolutions(resolutions) {
  /** @type {import('../src/types.js').VatDeliveryNotify} */
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
}

export function makeResolve(target, result) {
  /** @type {[import('../src/types.js').VatOneResolution]} */
  const resolutions = [[target, false, result]];
  return makeResolutions(resolutions);
}

export function makeReject(target, result) {
  /** @type {[import('../src/types.js').VatOneResolution]} */
  const resolutions = [[target, true, result]];
  return makeResolutions(resolutions);
}

/**
 * @param {string[]} vrefs
 * @returns {import('../src/types.js').VatDeliveryDropExports}
 */
export function makeDropExports(...vrefs) {
  /** @type {import('../src/types.js').VatDeliveryDropExports} */
  const vatDeliverObject = harden(['dropExports', vrefs]);
  return vatDeliverObject;
}

/**
 * @param {string[]} vrefs
 * @returns {import('../src/types.js').VatDeliveryRetireExports}
 */
export function makeRetireExports(...vrefs) {
  /** @type {import('../src/types.js').VatDeliveryRetireExports} */
  const vatDeliverObject = harden(['retireExports', vrefs]);
  return vatDeliverObject;
}

/**
 * @param {string[]} vrefs
 * @returns {import('../src/types.js').VatDeliveryRetireImports}
 */
export function makeRetireImports(...vrefs) {
  /** @type {import('../src/types.js').VatDeliveryRetireImports} */
  const vatDeliverObject = harden(['retireImports', vrefs]);
  return vatDeliverObject;
}
