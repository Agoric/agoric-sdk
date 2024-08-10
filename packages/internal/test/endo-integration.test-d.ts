import { expectNotType, expectType } from 'tsd';

import { M } from '@endo/patterns';

import type { InterfaceGuard } from '@endo/patterns';

expectType<InterfaceGuard>(
  M.interface('some sring', { inc: M.call().returns() }),
);
M.interface(
  // @ts-expect-error
  { not: 'a string' },
  'second arg',
);
