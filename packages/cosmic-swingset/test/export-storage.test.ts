import type { TestFn } from 'ava';
import anyTest from 'ava';
import { exportStorage } from '../src/export-storage.js';

const test = anyTest as TestFn;

// Export this binding when used by other modules.
const TestDataKey = Symbol('TestDataKey');

// Create a local alias, then
//  - regex replace '\._\b' with '[_]'
//  - regex replace '\b_:' with '[_]:'
const _ = TestDataKey;
type PublishedNode = {
  [k: string]: PublishedNode;
  [_]?: unknown;
};

type BatchChainStorageAPI = {
  get: (path: string) => string | null;
  entries: (path: string) => Array<[key: string, value?: string]>;
  children: (path: string) => string[];
  setWithoutNotify: (...entries: Array<[path: string, value?: string]>) => void;
};
type BatchChainStorage<
  M extends keyof BatchChainStorageAPI = keyof BatchChainStorageAPI,
> = (
  method: M,
  args: Parameters<BatchChainStorageAPI[M]>,
) => ReturnType<BatchChainStorageAPI[M]>;

const makeBatchChainStorage = (published: PublishedNode) => {
  const deleted: string[] = [];
  const lookup = (path: string): PublishedNode | null => {
    let node = published;
    if (path === 'published') return node;
    for (const key of path.replace(/^published\./, '').split('.')) {
      if (typeof node !== 'object' || node === null) return null;
      node = node[key];
      if (!node) return null;
    }
    return node;
  };

  const entries = (path: string): [key: string, value?: string][] => {
    const node = lookup(path);
    if (!node) return [];
    const out: [string, string?][] = [];
    const childData = Object.entries(node) as Array<[string, PublishedNode]>;
    for (const [key, child] of childData) {
      if (child[_] !== undefined) {
        out.push([key, `${child[_]}`]);
      } else {
        out.push([key]);
      }
    }
    return out;
  };

  const batchChainStorage: BatchChainStorage = (method, args) => {
    switch (method) {
      case 'get': {
        const [path] = args as [string];
        const node = lookup(path);
        if (node === null) return null;
        if (node[_] === undefined) return null;
        return `${node[_]}`;
      }
      case 'entries': {
        const [path] = args as [string];
        return entries(path);
      }
      case 'children': {
        const [path] = args as [string];
        return entries(path).map(([key]) => key);
      }
      case 'setWithoutNotify': {
        for (const [path] of args as [string][]) {
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
  const exportStorageSubtrees: string[] = ['published.c.o'];
  const expected: [string, string?][] = [
    ['published.c.o', 'top'],
    ['published.c.o.i'],
    ['published.c.o.i.n', '42'],
    ['published.c.o.w', 'moo'],
  ];

  const { batchChainStorage } = makeBatchChainStorage({
    c: {
      o: {
        [_]: 'top',
        i: {
          n: { [_]: 42 },
        },
        w: { [_]: 'moo' },
      },
    },
  });
  const actual = exportStorage(batchChainStorage, exportStorageSubtrees);
  t.deepEqual(actual, expected);
});

test('exportStorage clears crufty ToyUSD PSM', t => {
  const config: {
    clearStorageSubtrees: string[];
    exportStorageSubtrees: string[];
  } = {
    clearStorageSubtrees: ['published'],
    exportStorageSubtrees: [
      'published.psm.IST',
      'published.wallet',
      'published.provisionPool.metrics',
    ],
  };

  const publishedMain: PublishedNode = {
    agoricNames: {
      brand: { [_]: [['IST', { boardID: 'board01234' }]] },
    },
    psm: {
      IST: {
        ToyUSD: {
          metrics: { [_]: { shoeSize: 3 } },
        },
      },
    },
    wallet: {
      agoric123: { [_]: '$$$' },
    },
    provisionPool: {
      metrics: { [_]: { totalMintedConverted: 20 } },
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
