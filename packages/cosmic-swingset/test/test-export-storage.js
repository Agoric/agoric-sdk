// @ts-check
import '@endo/init';
import test from 'ava';
import { exportStorage } from '../src/export-storage.js';

const published = {
  c: {
    o: {
      _: 'top',
      i: {
        n: { _: 42 },
      },
      w: { _: 'moo' },
    },
  },
};

test('exportStorage example', async t => {
  const exportStorageSubtrees = ['published.c.o'];
  const expected = [
    ['published.c.o', 'top'],
    ['published.c.o.i'],
    ['published.c.o.i.n', 42],
    ['published.c.o.w', 'moo'],
  ];

  const lookup = path => {
    let node = published;
    for (const key of path.replace(/^published\./, '').split('.')) {
      if (key === '_') throw Error('_ is reserved for testing');
      node = node[key];
      if (!node) return null;
    }
    return node;
  };

  const batchChainStorage = (method, args) => {
    switch (method) {
      case 'get': {
        const [path] = args;
        const node = lookup(path);
        if (node === null) return null;
        if (!node._) return null;
        return `${node._}`;
      }
      case 'entries': {
        const [path] = args;
        const node = lookup(path);
        if (!node) return null;
        const out = [];
        for (const key of Object.keys(node)) {
          if (key === '_') continue;
          if (node[key]._) {
            out.push([key, node[key]._]);
          } else {
            out.push([key]);
          }
        }
        return out;
      }
      default:
        throw t.fail(method);
    }
  };

  const actual = exportStorage(batchChainStorage, exportStorageSubtrees);
  t.deepEqual(actual, expected);
});
