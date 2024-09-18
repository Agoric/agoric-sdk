import type { InterfaceGuard } from '@endo/patterns';
import { M } from '@endo/patterns';
import { expectNotType, expectType } from 'tsd';

expectType<InterfaceGuard>(
  M.interface('some sring', { inc: M.call().returns() }),
);
M.interface(
  // @ts-expect-error
  { not: 'a string' },
  'second arg',
);
