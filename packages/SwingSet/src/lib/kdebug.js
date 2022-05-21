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
  try {
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
          case 'symbol':
            return `[${val.name}]`;
          case '@@asyncIterator':
            return `[Symbol.asyncIterator]`;
          case 'error':
            return `new ${val.name}('${val.message}')`;
          default:
            // unknown qClass, treat it like any other object literal
            break;
        }
      }
      let result = '{';
      for (const prop of Object.getOwnPropertyNames(val)) {
        if (result.length !== 1) {
          result += ', ';
        }
        result += `${String(prop)}: ${legibilizeValue(val[prop], slots)}`;
      }
      result += '}';
      return result;
    } else {
      return JSON.stringify(val) || '<unintelligible value>';
    }
  } catch {
    return '<unintelligible value>';
  }
}

export function legibilizeMethod(method) {
  try {
    if (typeof method === 'string') {
      return method;
    } else if (typeof method === 'symbol') {
      return `[${method.toString()}]`;
    } else if (method === undefined) {
      return '<funcall>';
    } else if (typeof method === 'object') {
      const qclass = method['@qclass'];
      if (qclass === 'undefined') {
        return '<funcall>';
      } else if (qclass === 'symbol') {
        return `[${method.name}]`;
      } else if (qclass === '@@asyncIterator') {
        return `[Symbol.asyncIterator]`;
      } else {
        return '<invalid method type>';
      }
    } else {
      return '<unintelligible method>';
    }
  } catch {
    return '<unintelligible method>';
  }
}

export function extractMethod(methargsCapdata) {
  try {
    const methargs = JSON.parse(methargsCapdata.body);
    return legibilizeMethod(methargs[0]);
  } catch {
    return '<unknown>';
  }
}

export function legibilizeMessageArgs(methargsCapdata) {
  try {
    const methargs = JSON.parse(methargsCapdata.body);
    const [method, args] = methargs;
    const methodStr = legibilizeMethod(method);
    const argsStrs = args.map(arg =>
      legibilizeValue(arg, methargsCapdata.slots),
    );
    return [methodStr, argsStrs.join(', ')];
  } catch {
    return '<unintelligible message args>';
  }
}
