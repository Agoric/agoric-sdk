import { expectType } from 'tsd';
import type { Zone } from '@agoric/base-zone';
import type { Vow, VowTools } from '@agoric/vow';
import type { HostOf, GuestOf, HostFn, HostArgs } from '../src/types.js';

const vt: VowTools = null as any;

const sumVow = (a: number, b: number) => vt.asVow(() => a + b);

const sumPromise = (a: number, b: number) => Promise.resolve(a + b);

expectType<(p1: number, p2: number) => Promise<number>>(
  null as unknown as GuestOf<typeof sumVow>,
);

expectType<(p1: number, p2: number) => Vow<number>>(
  null as unknown as HostFn<typeof sumPromise>,
);
expectType<(p1: number, p2: number) => Vow<void>>(
  // @ts-expect-error incompatible return type
  null as unknown as HostFn<typeof sumPromise>,
);

type RecordArgs = HostArgs<[{ someValue: 'bar' }]>;
// @ts-expect-error sumPromise fn is not Passable
type FnArgs = HostArgs<[typeof sumPromise]>;
