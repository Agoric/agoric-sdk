import test from 'ava';
import { readFile, writeFile } from 'node:fs/promises';

import { agoric, evalBundles, waitForBlock } from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'core-eval-test-submission';

/**
 * @param {string} fileName base file name without .tjs extension
 * @param {Record<string, string>} replacements
 */
const replaceTemplateValuesInFile = async (fileName, replacements) => {
  let script = await readFile(`${fileName}.tjs`, 'utf-8');
  for (const [template, value] of Object.entries(replacements)) {
    script = script.replaceAll(`{{${template}}}`, value);
  }
  await writeFile(`${fileName}.js`, script);
};

test(`core eval works`, async t => {
  const nodePath = 'foo.bar';
  const nodeValue = 'baz';

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    NODE_PATH: nodePath,
    NODE_VALUE: nodeValue,
  });

  await evalBundles(SUBMISSION_DIR);

  await waitForBlock(2); // enough time for core eval to execute ?
  const chainStorageValue = await agoric.follow(
    '-lF',
    `:${nodePath}`,
    '-o',
    'text',
  );

  t.is(chainStorageValue, nodeValue);
});
