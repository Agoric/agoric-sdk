import { assert, details as X } from '@agoric/assert';

let enableKDebug = false;

export function kdebugEnable(flag) {
  enableKDebug = !!flag;
}

export function kdebug(...args) {
  if (enableKDebug) {
    console.log(...args);
  }
}

export function legibilizeValue(val, slots) {
  if (Array.isArray(val)) {
    let result = '[';
    for (const elem of val) {
      if (result.length !== 1) {
        result += ', ';
      }
      result += legibilizeValue(elem, slots);
    }
    result += ']';
    return result;
  } else if (val && typeof val === 'object' && val.constructor === Object) {
    const qClass = val['@qclass'];
    if (qClass) {
      switch (qClass) {
        case 'undefined':
        case 'NaN':
        case 'Infinity':
        case '-Infinity':
          return qClass;
        case 'bigint':
          return val.digits;
        case 'slot':
          return `@${slots[val.index]}`;
        case 'error':
          return `new ${val.name}('${val.message}')`;
        case 'ibid':
          return `ibid(${val.index})`;
        default:
          assert.fail(X`unknown qClass ${qClass} in legibilizeValue`);
      }
    } else {
      let result = '{';
      for (const prop of Object.getOwnPropertyNames(val)) {
        if (result.length !== 1) {
          result += ', ';
        }
        result += `${String(prop)}: ${legibilizeValue(val[prop], slots)}`;
      }
      result += '}';
      return result;
    }
  } else {
    return JSON.stringify(val);
  }
}

export function legibilizeMessageArgs(args) {
  try {
    return JSON.parse(args.body).map(arg => legibilizeValue(arg, args.slots));
  } catch (e) {
    return [args];
  }
}
