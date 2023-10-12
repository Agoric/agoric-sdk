import { kser } from '@agoric/kmarshal';
import { vstr } from './vat-util.js';

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
 * @param {unknown} target
 * @param {string | symbol} method
 * @param {any[]} args
 * @param {unknown} result
 */
export function makeMessage(target, method, args = [], result = null) {
  const methargs = kser([method, args]);
  const msg = { methargs, result };
  const vatDeliverObject = harden(['message', target, msg]);
  return vatDeliverObject;
}

export function makeStartVat(vatParameters) {
  return harden(['startVat', vatParameters]);
}

export function makeBringOutYourDead() {
  return harden(['bringOutYourDead']);
}

export function makeResolutions(resolutions) {
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
}

export function makeResolve(target, result) {
  const resolutions = [[target, false, result]];
  return makeResolutions(resolutions);
}

export function makeReject(target, result) {
  const resolutions = [[target, true, result]];
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
}

export function makeDropExports(...vrefs) {
  const vatDeliverObject = harden(['dropExports', vrefs]);
  return vatDeliverObject;
}

export function makeRetireExports(...vrefs) {
  const vatDeliverObject = harden(['retireExports', vrefs]);
  return vatDeliverObject;
}

export function makeRetireImports(...vrefs) {
  const vatDeliverObject = harden(['retireImports', vrefs]);
  return vatDeliverObject;
}
