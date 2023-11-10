import { MatcherType } from '@agoric/internal/src/types.js';
import type { InterfaceGuard } from '@endo/patterns';

type MethodGuardPayload = {
  callKind: 'sync' | 'async';
  argGuards: ArgGuard[];
  optionalArgGuards?: ArgGuard[];
  restArgGuard?: unknown;
  returnGuard: unknown;
};

declare const methodSignature: unique symbol;
export type TypedMethodGuard<F extends Function> = {
  klass: 'methodGuard';
} & MethodGuardPayload & { methodSignature: F };

export type GuardedMethod<G extends MethodGuard> = G extends TypedMethodGuard<
  infer F
>
  ? F
  : unknown;

export type GuardedMethods<I extends InterfaceGuard> = {
  readonly [P in keyof I['methodGuards']]: GuardedMethod<I['methodGuards'][P]>;
};
