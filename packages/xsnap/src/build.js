import * as childProcess from 'child_process';
import { existsSync } from 'fs';
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
  // Detect whether we're under Git.  We aren't when building Docker images.
  let underGit;
  try {
    await exec('git', '.', ['submodule']);
    underGit = true;
  } catch (e) {
    underGit = false;
  }

  // Do the moral equivalent of submodule when not under Git.
  // TODO: refactor overlap with git submodules file.
  if (!underGit) {
    if (!existsSync('moddable')) {
      await exec('git', '.', [
        'clone',
        'https://github.com/Moddable-OpenSource/moddable.git',
        'moddable',
      ]);
    }
    await exec('git', 'moddable', ['pull', '--ff-only']);
  } else {
    await exec('git', '.', ['submodule', 'update', '--init']);
  }

  // Run command depending on the OS
  if (os.type() === 'Linux') {
    await exec('make', 'makefiles/lin');
    await exec('make', 'makefiles/lin', ['GOAL=debug']);
  } else if (os.type() === 'Darwin') {
    await exec('make', 'makefiles/mac');
    await exec('make', 'makefiles/mac', ['GOAL=debug']);
  } else if (os.type() === 'Windows_NT') {
    await exec('nmake', 'makefiles/win');
    await exec('make', 'makefiles/win', ['GOAL=debug']);
  } else {
    throw new Error(`Unsupported OS found: ${os.type()}`);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
