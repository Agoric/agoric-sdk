import { expectType } from 'tsd';
import type { Zone } from '@agoric/base-zone';
import type { Vow, VowTools } from '@agoric/vow';
import type { HostOf, GuestOf } from '../src/types.js';

const vt: VowTools = null as any;

const sumVow = (a: number, b: number) => vt.asVow(() => a + b);

const sumPromise = (a: number, b: number) => Promise.resolve(a + b);

expectType<(p1: number, p2: number) => Promise<number>>(
  null as unknown as GuestOf<typeof sumVow>,
);

expectType<(p1: number, p2: number) => Vow<number>>(
  null as unknown as HostOf<typeof sumPromise>,
);
expectType<(p1: number, p2: number) => Vow<void>>(
  // @ts-expect-error incompatible return type
  null as unknown as HostOf<typeof sumPromise>,
);
