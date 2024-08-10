import { expectType } from 'tsd';
import type { Zone } from '@agoric/base-zone';
import type { Vow } from '../src/types.js';
import type { VowTools } from '../src/tools.js';

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
