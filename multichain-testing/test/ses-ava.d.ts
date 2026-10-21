// @endo/ses-ava ships no type declarations (dropped in 1.4.x), so importing
// it degrades `test` to `any` and defeats type-level assertions (e.g. the
// @ts-expect-error directives in devex.test.ts). Declare the surface we use,
// mirroring packages/internal/test/ses-ava.d.ts.
declare module '@endo/ses-ava/prepare-endo.js' {
  import type { TestFn } from 'ava';

  /** ses-ava's prepared ava test function. */
  const test: TestFn;
  export default test;
}
