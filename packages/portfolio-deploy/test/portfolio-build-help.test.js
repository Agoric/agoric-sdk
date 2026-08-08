import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import build from '../src/portfolio.build.js';

test('portfolio.build --help prints usage and exits', async t => {
  const logs = [];
  await build(null, {
    scriptArgs: ['--help'],
    console: harden({
      log: msg => logs.push(msg),
    }),
    fetch: async () => {
      throw Error('help should not fetch');
    },
  });

  t.is(logs.length, 1);
  t.regex(
    logs[0],
    /^Usage: agoric run src\/portfolio\.build\.js/,
  );
  t.regex(logs[0], /--net <network>/);
  t.regex(logs[0], /--replace <boardId>/);
  t.regex(logs[0], /--no-flow-config/);
  t.regex(logs[0], /--yds <url>/);
});
