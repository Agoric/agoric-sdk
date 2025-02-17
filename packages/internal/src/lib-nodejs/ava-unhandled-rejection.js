// @ts-check
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import engineGC from './engine-gc.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';

/**
 * @import {ExecutionContext, Macro} from 'ava';
 */

export const AVA_EXPECT_UNHANDLED_REJECTIONS =
  'AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS';

export const SUBTEST_PREFIX = '(unhandled rejection subprocess): ';

/**
 * @template C
 * @param {string} importMetaUrl
 * @returns {Macro<
 *   [
 *     expectedUnhandled: number,
 *     name: string,
 *     testFn: (t: ExecutionContext<C>) => any,
 *   ],
 *   C
 * >}
 */
export const makeExpectUnhandledRejectionMacro = importMetaUrl => {
  const self = fileURLToPath(importMetaUrl);
  const gcAndFinalize = makeGcAndFinalize(engineGC);

  if (process.env[AVA_EXPECT_UNHANDLED_REJECTIONS]) {
    return {
      title: (_, _expectedUnhandled, name, _testFn) => SUBTEST_PREFIX + name,
      exec: async (t, _expectedUnhandled, _name, testFn) => {
        await null;
        try {
          const result = await testFn(t);
          return result;
        } finally {
          await gcAndFinalize();
        }
      },
    };
  }

  return {
    title: (_, _expectedUnhandled, name, _testFn) => name,
    exec: async (t, expectedUnhandled, name, _testFn) =>
      new Promise((resolve, reject) => {
        const ps = spawn('ava', [self, '-m', SUBTEST_PREFIX + name], {
          env: {
            ...process.env,
            [AVA_EXPECT_UNHANDLED_REJECTIONS]: `${expectedUnhandled}`,
          },
          stdio: ['ignore', 'inherit', 'inherit', 'ignore'],
        });

        ps.on('close', code => {
          t.is(code, 0, `got exit code ${code}, expected 0 for ${name}`);
          resolve();
        });
        ps.on('error', reject);
      }),
  };
};
