// eslint-disable-next-line import/no-extraneous-dependencies -- `ava` is the test runner; this hook ships with the package
import { registerCompletionHandler } from 'ava';
import process from 'node:process';

registerCompletionHandler(() => {
  process.exit();
});
