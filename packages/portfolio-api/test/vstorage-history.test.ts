import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { iterateVstorageHistory } from '../src/vstorage-schema.js';

test('iterateVstorageHistory walks height history with decoder', async t => {
  const heights = [5n, 4n, 3n, 1n, 0n];
  let index = 0;
  const readAt = async (_path: string, _height?: number | bigint) => {
    const blockHeight = heights[index++];
    return {
      blockHeight,
      values: blockHeight
        ? [JSON.stringify({ blockHeight: Number(blockHeight) })]
        : [],
    };
  };

  const seen: Array<{ blockHeight: bigint; values: unknown[] }> = [];
  for await (const entry of iterateVstorageHistory({
    readAt,
    path: 'published.demo.node',
    minHeight: 3n,
    decodeValue: value => JSON.parse(value as string),
  })) {
    seen.push(entry);
  }

  t.deepEqual(
    seen.map(({ blockHeight }) => blockHeight),
    [5n, 4n, 3n],
    'stops once minHeight reached',
  );
  t.deepEqual(seen[0]?.values[0], { blockHeight: 5 });
});
