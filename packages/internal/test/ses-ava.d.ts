// @endo/ses-ava ships no type declarations, so importing it under
// `noImplicitAny` raises TS7016. Declare the surface we use. Harmless when
// `noImplicitAny` is off (it just supplies types the package lacks).
declare module '@endo/ses-ava/prepare-endo.js' {
  import type { TestFn } from 'ava';

  /** ses-ava's prepared ava test function. */
  const test: TestFn;
  export default test;
}
