import test from 'ava';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileP = promisify(execFile);

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const jsonlConsoleHref = pathToFileURL(
  fileURLToPath(new URL('../src/node/jsonl-console.js', import.meta.url)),
).href;

const runNode = async (source, envOverrides = {}) => {
  const env = {
    ...process.env,
    FORCE_COLOR: '0',
    ...envOverrides,
  };
  delete env.LOCKDOWN_OPTIONS;
  delete env.LOCKDOWN_ERROR_TAMING;

  return execFileP(
    process.execPath,
    ['--input-type=module', '--eval', source],
    {
      cwd: repoRoot,
      env,
    },
  );
};

const parseJsonl = stdout =>
  stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

test('installJsonlConsole preserves SES causal console expansion with direct lockdown', async t => {
  const { stdout, stderr } = await runNode(
    `
      import { installJsonlConsole } from ${JSON.stringify(jsonlConsoleHref)};
      import 'ses';

      lockdown({ consoleTaming: 'safe', domainTaming: 'unsafe' });
      await installJsonlConsole({ label: 'internal-direct-lockdown' });

      const err = Error('outer');
      assert.note(err, assert.details\`because \${Error('inner')}\`);
      console.log('before', err, 'after');
    `,
    { DEBUG: 'agoric:log' },
  );

  t.is(stderr, '');
  const [record] = parseJsonl(stdout);
  t.is(record.label, 'internal-direct-lockdown');
  t.is(record.level, 30);
  t.regex(
    record.msg,
    /^before \(Error#\d+\) after\nError#\d+: outer\n\n\s+at /,
  );
  t.regex(record.msg, /Error#\d+ ERROR_NOTE: because \(Error#\d+\)/);
  t.regex(record.msg, /Nested error under Error#\d+\n\s+Error#\d+: inner/);
  t.notRegex(record.msg, /\bError: outer\b/);
});

test('installJsonlConsole can be layered after @endo/init', async t => {
  const { stdout, stderr } = await runNode(
    `
      import { installJsonlConsole } from ${JSON.stringify(jsonlConsoleHref)};
      import '@endo/init';

      await installJsonlConsole({ label: 'internal-endo-init' });
      console.warn(Error('from endo init'));
    `,
    { DEBUG: 'agoric:warn' },
  );

  t.is(stdout, '');
  const [record] = parseJsonl(stderr);
  t.is(record.label, 'internal-endo-init');
  t.is(record.level, 40);
  t.regex(record.msg, /^\(Error#\d+\)\nError#\d+: from endo init\n/);
  t.notRegex(record.msg, /\bError: from endo init\b/);
});

test('installJsonlConsole respects DEBUG level filtering', async t => {
  const { stdout, stderr } = await runNode(
    `
      import { installJsonlConsole } from ${JSON.stringify(jsonlConsoleHref)};
      import 'ses';

      lockdown({ consoleTaming: 'safe', domainTaming: 'unsafe' });
      await installJsonlConsole({ label: 'internal-filter' });

      console.log('hidden log');
      console.info('visible info');
      console.debug('hidden debug');
    `,
    { DEBUG: 'agoric:info' },
  );

  t.is(stderr, '');
  const records = parseJsonl(stdout);
  t.deepEqual(
    records.map(({ label, level, msg }) => ({ label, level, msg })),
    [{ label: 'internal-filter', level: 30, msg: 'visible info' }],
  );
});

test('installJsonlConsole restore returns to the captured initial console', async t => {
  const { stdout, stderr } = await runNode(
    `
      import { installJsonlConsole } from ${JSON.stringify(jsonlConsoleHref)};
      import 'ses';

      lockdown({ consoleTaming: 'safe', domainTaming: 'unsafe' });
      const restore = await installJsonlConsole({ label: 'internal-restore' });

      console.info('json line');
      restore();
      console.info('plain line');
    `,
    { DEBUG: 'agoric:info' },
  );

  t.is(stderr, '');
  const lines = stdout.trim().split('\n');
  t.is(lines.length, 2);

  const record = JSON.parse(lines[0]);
  t.is(record.label, 'internal-restore');
  t.is(record.msg, 'json line');
  t.is(lines[1], 'plain line');
});
