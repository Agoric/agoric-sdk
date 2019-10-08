// Type definitions for eventual-send
// TODO: Add jsdocs.

interface EHandler {
  GET(p: EPromise<unknown>, name: string | number | symbol): EPromise<unknown>;
  PUT(p: EPromise<unknown>, name: string | number | symbol, value: unknown): EPromise<void>;
  DELETE(p: EPromise<unknown>, name: string | number | symbol): EPromise<boolean>;
  POST(p: EPromise<unknown>, name?: string | number | symbol, args: unknown[]): EPromise<unknown>;
}

export interface EPromise<R> extends Promise<R> {
  get(name: string | number | symbol): EPromise<unknown>;
  put(name: string | number | symbol, value: unknown): EPromise<void>;
  delete(name: string | number | symbol): EPromise<boolean>;
  post(name?: string | number | symbol, args: unknown[]): EPromise<unknown>;
  invoke(name: string | number | symbol, ...args: unknown[]): EPromise<unknown>;
  fapply(args: unknown[]): EPromise<unknown>;
  fcall(...args: unknown[]): EPromise<unknown>;
  then<TResult1 = R, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ) => EPromise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ) => EPromise<R | TResult>;
  finally(onfinally?: (() => void) | undefined | null): EPromise<R>;
}

interface FulfilledStatus {
  status: 'fulfilled';
  value: unknown;
}

interface RejectedStatus {
  status: 'rejected';
  reason: unknown;
}

type SettledStatus = FulfilledStatus | RejectedStatus;

type HandledExecutor<R> = (
  resolveHandled: (value?: R) => void,
  rejectHandled: (reason?: unknown) => void,
  resolveWithPresence: (presenceHandler: EHandler) => object,
) => void;

interface EPromiseConstructor extends PromiseConstructor {
  prototype: EPromise<unknown>;
  makeHandled<R>(executor: HandledExecutor<R>, unfulfilledHandler?: EHandler): EPromise<R>;
  resolve<R>(value: R): EPromise<R>;
  reject(reason: unknown): EPromise<never>;
  all(iterable: Iterable): EPromise<unknown[]>;
  allSettled(iterable: Iterable): EPromise<SettledStatus[]>;
  race(iterable: Iterable): EPromise<unknown>; 
}

export default function maybeExtendPromise(Promise: PromiseConstructor): EPromiseConstructor;
