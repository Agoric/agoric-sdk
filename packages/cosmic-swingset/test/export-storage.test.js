// @ts-check
import test from 'ava';
import { exportStorage } from '../src/export-storage.js';

const makeBatchChainStorage = published => {
  const deleted = [];
  const batchChainStorage = (method, args) => {
    const lookup = path => {
      let node = published;
      if (path === 'published') return node;
      for (const key of path.replace(/^published\./, '').split('.')) {
        if (key === '_') throw Error('_ is reserved for testing');
        node = node[key];
        if (!node) return null;
      }
      return node;
    };

    const entries = path => {
      const node = lookup(path);
      if (!node) return [];
      const out = [];
      for (const key of Object.keys(node)) {
        if (key === '_') continue;
        if (node[key]._) {
          out.push([key, `${node[key]._}`]);
        } else {
          out.push([key]);
        }
      }
      return out;
    };

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
        return entries(path);
      }
      case 'children': {
        const [path] = args;
        return entries(path).map(([key]) => key);
      }
      case 'setWithoutNotify': {
        for (const [path] of args) {
          deleted.push(path);
        }
        return;
      }
      default:
        throw Error(`not impl: ${method}`);
    }
  };
  return { batchChainStorage, deleted };
};

test('exportStorage example', t => {
  const exportStorageSubtrees = ['published.c.o'];
  const expected = [
    ['published.c.o', 'top'],
    ['published.c.o.i'],
    ['published.c.o.i.n', '42'],
    ['published.c.o.w', 'moo'],
  ];

  const { batchChainStorage } = makeBatchChainStorage({
    c: {
      o: {
        _: 'top',
        i: {
          n: { _: 42 },
        },
        w: { _: 'moo' },
      },
    },
  });
  const actual = exportStorage(batchChainStorage, exportStorageSubtrees);
  t.deepEqual(actual, expected);
});

test('exportStorage clears crufty ToyUSD PSM', t => {
  const config = {
    clearStorageSubtrees: ['published'],
    exportStorageSubtrees: [
      'published.psm.IST',
      'published.wallet',
      'published.provisionPool.metrics',
    ],
  };

  const publishedMain = {
    agoricNames: {
      brand: { _: [['IST', { boardID: 'board01234' }]] },
    },
    psm: {
      IST: {
        ToyUSD: {
          metrics: { _: { shoeSize: 3 } },
        },
      },
    },
    wallet: {
      agoric123: { _: '$$$' },
    },
    provisionPool: {
      metrics: { _: { totalMintedConverted: 20 } },
    },
  };

  const { batchChainStorage, deleted } = makeBatchChainStorage(publishedMain);
  const actual = exportStorage(
    batchChainStorage,
    config.exportStorageSubtrees,
    config.clearStorageSubtrees,
  );
  t.deepEqual(actual, [
    ['published.psm.IST'],
    ['published.psm.IST.ToyUSD'],
    ['published.psm.IST.ToyUSD.metrics', '[object Object]'],
    ['published.wallet'],
    ['published.wallet.agoric123', '$$$'],
    ['published.provisionPool.metrics', '[object Object]'],
  ]);

  t.true(deleted.includes('published.psm.IST.ToyUSD'));
});
