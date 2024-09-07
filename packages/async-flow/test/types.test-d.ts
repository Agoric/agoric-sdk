import { expectType } from 'tsd';
import type { Vow, VowTools } from '@agoric/vow';
import type {
  HostOf,
  GuestOf,
  HostInterface,
  GuestInterface,
} from '../src/types.js';

const castable: unknown = null;
const vt: VowTools = null as any;

const sumVow = (a: number, b: number) => vt.asVow(() => a + b);

const sumPromise = (a: number, b: number) => Promise.resolve(a + b);

expectType<(p1: number, p2: number) => Promise<number>>(
  castable as GuestOf<typeof sumVow>,
);

expectType<(p1: number, p2: number) => Vow<number>>(
  castable as HostOf<typeof sumPromise>,
);
expectType<(p1: number, p2: number) => Vow<void>>(
  // @ts-expect-error incompatible return type
  castable as HostOf<typeof sumPromise>,
);

// Test HostInterface and GuestInterface with an exoClass object
type ExoAPIBase = {
  getValue: () => number;
  setValue: (value: number) => void;
  getCopyData: () => Record<string, number>[];
  // TODO include `getRemote() => Guarded<...>`, since durable exos are passable
};
type ExoGuestAPI = ExoAPIBase & {
  getValueAsync: () => Promise<number>;
};

type ExoHostAPI = ExoAPIBase & {
  getValueAsync: () => Vow<number>;
};

expectType<
  ExoAPIBase & {
    getValueAsync: () => Vow<number>;
  }
>(castable as HostInterface<ExoGuestAPI>);
expectType<
  ExoAPIBase & {
    getValueAsync: () => Promise<number>;
  }
>(castable as GuestInterface<ExoHostAPI>);

// Test HostInterface and GuestInterface with classKit (nested) objects
expectType<{
  facet: ExoAPIBase & {
    getValueAsync: () => Vow<number>;
  };
}>(
  castable as HostInterface<{
    facet: ExoGuestAPI;
  }>,
);
expectType<{
  facet: ExoAPIBase & {
    getValueAsync: () => Promise<number>;
  };
}>(
  castable as GuestInterface<{
    facet: ExoHostAPI;
  }>,
);
