import { expectType } from 'tsd';

import type { Zone } from '@agoric/base-zone';
import type { Vow, VowTools } from '../src/types.js';

const vt: VowTools = null as any;

const zone: Zone = null as any;

// @ts-expect-error function param must return promise
vt.retryable(zone, 'foo', () => null);
vt.retryable(zone, 'foo', () => Promise.resolve(null));

expectType<(p1: number, p2: string) => Vow<{ someValue: 'bar' }>>(
  vt.retryable(zone, 'foo', (p1: number, p2: string) =>
    Promise.resolve({ someValue: 'bar' } as const),
  ),
);

expectType<
  Vow<
    (
      | { status: 'fulfilled'; value: any }
      | { status: 'rejected'; reason: any }
    )[]
  >
>(
  vt.allSettled([
    Promise.resolve(1),
    Promise.reject(new Error('test')),
    Promise.resolve('hello'),
  ]),
);
