/* global __filename */
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import * as childProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { xsnap } from '../src/xsnap';

const importMetaUrl = `file://${__filename}`;

const asset = async (...segments) =>
  fs.promises.readFile(
    path.join(importMetaUrl.replace('file:/', ''), '..', ...segments),
    'utf-8',
  );

const decoder = new TextDecoder();

const xsnapOptions = {
  name: 'xsnap test worker',
  spawn: childProcess.spawn,
  os: os.type(),
  stderr: 'inherit',
  stdout: 'inherit',
};

const options = () => {
  const messages = [];
  const handleCommand = async message => {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  };
  return { ...xsnapOptions, handleCommand, messages };
};

const timeit = async (
  t,
  bootScript,
  { branding, count, name, pre, body, post },
) => {
  const opts = options();
  const vat = xsnap(opts);
  t.teardown(vat.terminate);
  await vat.evaluate(`
    globalThis.HARDEN_BRANDING = ${JSON.stringify(branding)};
  `);
  await vat.evaluate(bootScript);
  await vat.evaluate(`
    const encoder = new TextEncoder();
    const send = msg =>
      issueCommand(encoder.encode(JSON.stringify(msg)).buffer);
    function f() {
      const before = performance.now();
      ${pre}
      for (let i = 0; i < ${count}; i++) {
        ${body}
      }
      ${post}
      const after = performance.now();
      send([after - before]);
      return 'some return value';
    }
    globalThis.f = f;
  `);
  const r = await vat.evaluate('f();');
  return {
    branding,
    count,
    name,
    ...r.meterUsage,
    innerTime: JSON.parse(opts.messages[0])[0],
  };
};

(async () => {
  const bootScript = await asset('..', 'dist', 'bundle-ses-boot.umd.js');
  const pre = 'let list = {};';
  for (const count of [10, 100, 1000, 10_000, 100_000]) {
    for (const [name, body, post] of [
      ['nothing', '//nothing', '//nothing'],
      ['list', 'list = {next: list};', '//nothing'],
      ['listHard', 'list = harden({next: list});', '//nothing'],
      ['hardList', 'list = {next: list};', 'harden(list);'],
    ]) {
      for (const branding of ['BOTH', 'POSITIVE', 'NEGATIVE']) {
        const params = {
          branding,
          count,
          name,
          pre,
          body,
          post,
        };
        const title = `time, ${branding}, ${count}, ${name}`;
        test(title, async t => {
          const before = Date.now();
          try {
            const result = await timeit(t, bootScript, params);
            const after = Date.now();
            const outerTime = after - before;
            const record = {
              ...result,
              outerTime,
            };
            console.log(JSON.stringify(record, undefined, ' '), '\n,\n');
            t.pass();
          } catch (reason) {
            const after = Date.now();
            const outerTime = after - before;
            const record = {
              message: reason.message,
              branding,
              count,
              name,
              outerTime,
            };
            t.fail(JSON.stringify(record, undefined, ' '));
          }
        });
      }
    }
  }
})();
