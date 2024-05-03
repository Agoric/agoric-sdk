import { MatcherType } from '@agoric/internal/src/types.js';
import type { InterfaceGuard, MethodGuard } from '@endo/patterns';

declare const methodSignature: unique symbol;
export type TypedMethodGuard<F extends CallableFunction> = MethodGuard & {
  methodSignature: F;
};

export type GuardedMethod<G extends MethodGuard> = G extends TypedMethodGuard<
  infer F
>
  ? F
  : // Could be `unknown` but this helps detect errors
    never;

export type GuardedMethods<I extends InterfaceGuard> = {
  readonly [P in keyof I['payload']['methodGuards']]: GuardedMethod<
    I['payload']['methodGuards'][P]
  >;
};

export type TypedInterfaceGuard = InterfaceGuard & {
  payload: { methodGuards: Record<PropertyKey, TypedMethodGuard> };
};
