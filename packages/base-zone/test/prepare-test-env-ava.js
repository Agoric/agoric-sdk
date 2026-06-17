import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

// XXX @endo/ses-ava's `wrapTest` is typed `<T>(avaTest: T) => T`, but its
// `OnlyFn` type-parameter constraint makes TS resolve the result to `any`,
// which silently untypes `t` (and `t.context`) in every consumer. Annotate
// to recover ava's `TestFn` typing.
/** @type {import('ava').TestFn} */
export const test = wrapTest(rawTest);
