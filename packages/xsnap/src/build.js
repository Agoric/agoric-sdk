/* global process */
import * as childProcess from 'child_process';
import { existsSync, readFileSync } from 'fs';
import os from 'os';

function exec(command, cwd, args = []) {
  const child = childProcess.spawn(command, args, {
    cwd,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    child.on('close', () => {
      resolve();
    });
    child.on('error', err => {
      reject(new Error(`${command} error ${err}`));
    });
    child.on('exit', code => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

(async () => {
  // Allow overriding of the checked-out version of the Moddable submodule.
  const moddableCommitHash = process.env.MODDABLE_COMMIT_HASH;
  const moddableUrl =
    process.env.MODDABLE_URL || 'https://github.com/agoric-labs/moddable.git';

  if (moddableCommitHash) {
    // Do the moral equivalent of submodule update when explicitly overriding.
    if (!existsSync('moddable')) {
      await exec('git', '.', [
        'clone',
        // NOTE: We need to depend on cloning from agoric-labs.
        moddableUrl,
        'moddable',
      ]);
    }
    await exec('git', 'moddable', ['checkout', moddableCommitHash]);
  } else {
    await exec('git', '.', ['submodule', 'update', '--init', '--checkout']);
  }

  const pjson = readFileSync(
    new URL('../package.json', import.meta.url).pathname,
    'utf-8',
  );
  const pkg = JSON.parse(pjson);
  const XSNAP_VERSION = `XSNAP_VERSION=${pkg.version}`;

  // Run command depending on the OS
  if (os.type() === 'Linux') {
    await exec('make', 'makefiles/lin', [XSNAP_VERSION]);
    await exec('make', 'makefiles/lin', ['GOAL=debug', XSNAP_VERSION]);
  } else if (os.type() === 'Darwin') {
    await exec('make', 'makefiles/mac', [XSNAP_VERSION]);
    await exec('make', 'makefiles/mac', ['GOAL=debug', XSNAP_VERSION]);
  } else if (os.type() === 'Windows_NT') {
    await exec('nmake', 'makefiles/win', [XSNAP_VERSION]);
    await exec('make', 'makefiles/win', ['GOAL=debug', XSNAP_VERSION]);
  } else {
    throw new Error(`Unsupported OS found: ${os.type()}`);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
