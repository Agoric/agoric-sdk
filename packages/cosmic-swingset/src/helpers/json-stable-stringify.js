/* eslint-disable */

// https://github.com/substack/json-stable-stringify/
// npm json-stable-stringify

// slightly adapted to work with SES

const isArray =
  Array.isArray ||
  (x => {
    return {}.toString.call(x) === '[object Array]';
  });

const objectKeys =
  Object.keys ||
  function (obj) {
    const has =
      Object.prototype.hasOwnProperty ||
      function () {
        return true;
      };
    const keys = [];
    for (const key in obj) {
      if (has.call(obj, key)) keys.push(key);
    }
    return keys;
  };

export default function stableStringify(obj, opts) {
  if (!opts) opts = {};
  if (typeof opts === 'function') opts = { cmp: opts };
  let space = opts.space || '';
  if (typeof space === 'number') space = Array(space + 1).join(' ');
  const cycles = typeof opts.cycles === 'boolean' ? opts.cycles : false;
  const replacer = opts.replacer || ((key, value) => value);

  const cmp =
    opts.cmp &&
    (function (f) {
      return function (node) {
        return function (a, b) {
          const aobj = { key: a, value: node[a] };
          const bobj = { key: b, value: node[b] };
          return f(aobj, bobj);
        };
      };
    })(opts.cmp);

  const seen = [];
  return (function stringify(parent, key, node, level) {
    const indent = space ? `\n${new Array(level + 1).join(space)}` : '';
    const colonSeparator = space ? ': ' : ':';

    if (node && node.toJSON && typeof node.toJSON === 'function') {
      node = node.toJSON();
    }

    node = replacer.call(parent, key, node);

    if (node === undefined) {
      return;
    }
    if (typeof node !== 'object' || node === null) {
      return JSON.stringify(node);
    }
    if (isArray(node)) {
      const out = [];
      for (let i = 0; i < node.length; i += 1) {
        const item =
          stringify(node, i, node[i], level + 1) || JSON.stringify(null);
        out.push(indent + space + item);
      }
      return `[${out.join(',')}${indent}]`;
    }
    if (seen.indexOf(node) !== -1) {
      if (cycles) return JSON.stringify('__cycle__');
      throw TypeError('Converting circular structure to JSON');
    } else seen.push(node);

    const keys = objectKeys(node).sort(cmp && cmp(node));
    const out = [];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = stringify(node, key, node[key], level + 1);

      if (!value) continue;

      const keyValue = JSON.stringify(key) + colonSeparator + value;
      out.push(indent + space + keyValue);
    }
    seen.splice(seen.indexOf(node), 1);
    return `{${out.join(',')}${indent}}`;
  })({ '': obj }, '', obj, 0);
}
