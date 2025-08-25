// @ts-check
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import engineGC from './engine-gc.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';

/**
 * @import {ExecutionContext, Macro, TestFn} from 'ava';
 */

export const AVA_EXPECT_UNHANDLED_REJECTIONS =
  'AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS';

export const SUBTEST_PREFIX = '(unhandled rejection subprocess): ';

/**
 * @template C
 * @param {object} powers
 * @param {TestFn<C>} powers.test
 * @param {string} powers.importMetaUrl
 * @returns {(
 *   expectedUnhandled: number,
 * ) => Macro<[name: string, impl: (t: ExecutionContext<C>) => any], C>}
 */
export const makeExpectUnhandledRejection = ({ test, importMetaUrl }) => {
  const self = fileURLToPath(importMetaUrl);
  const gcAndFinalize = makeGcAndFinalize(engineGC);

  if (process.env[AVA_EXPECT_UNHANDLED_REJECTIONS]) {
    return _expectedUnhandled =>
      test.macro({
        title: (_, name, _impl) => SUBTEST_PREFIX + name,
        exec: async (t, _name, impl) => {
          await null;
          try {
            const result = await impl(t);
            return result;
          } finally {
            await gcAndFinalize();
          }
        },
      });
  }

  return expectedUnhandled =>
    test.macro({
      title: (_, name, _impl) => name,
      exec: async (t, name, _impl) =>
        new Promise((resolve, reject) => {
          const ps = spawn('ava', [self, '-m', SUBTEST_PREFIX + name], {
            env: {
              ...process.env,
              [AVA_EXPECT_UNHANDLED_REJECTIONS]: `${expectedUnhandled}`,
            },
            stdio: ['ignore', 'inherit', 'inherit', 'ignore'],
          });

          ps.on('close', code => {
            const expectedCode = expectedUnhandled === 0 ? 0 : 1;
            t.is(
              code,
              expectedCode,
              `got exit code ${code}, expected ${expectedCode} for ${name}`,
            );
            resolve();
          });
          ps.on('error', reject);
        }),
    });
};
