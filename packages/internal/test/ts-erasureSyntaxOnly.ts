// NB: not a test that runs.

// Test the `--erasureSyntaxOnly` option of TypeScript 5.8
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-option

// @ts-expect-error ts(1294) This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
export enum Foo {
  A = 1,
  B = 2,
  C = 3,
}
