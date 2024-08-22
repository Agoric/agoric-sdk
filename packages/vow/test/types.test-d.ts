import { expectType } from 'tsd';
import type { Zone } from '@agoric/base-zone';
import type { Vow } from '../src/types.js';
import type { VowTools } from '../src/tools.js';
import type { Watch } from '../src/watch.js';

const vt: VowTools = null as any;

const zone: Zone = null as any;

// @ts-expect-error function param must return promise
vt.retriable(zone, 'foo', () => null);
vt.retriable(zone, 'foo', () => Promise.resolve(null));

expectType<(p1: number, p2: string) => Vow<{ someValue: 'bar' }>>(
  vt.retriable(zone, 'foo', (p1: number, p2: string) =>
    Promise.resolve({ someValue: 'bar' } as const),
  ),
);

expectType<Watch>(vt.watch);

const v: Vow = null as any;
vt.watch(
  v,
  { onFulfilled: (x: string, p1: string, p2: number) => x },
  'bar',
  3,
);
// @ts-expect-error expected arg for p2
vt.watch(v, { onFulfilled: (x: string, p1: string, p2: number) => x }, 'bar');
vt.watch(
  v,
  { onFulfilled: (x: string, p1: string, p2: number) => x },
  'bar',
  // @ts-expect-error expected number
  'baz',
);
