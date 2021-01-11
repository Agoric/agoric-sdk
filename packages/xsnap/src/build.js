import * as childProcess from 'child_process';
import os from 'os';

function exec(command, cwd) {
  const child = childProcess.spawn(command, {
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
  // Run command depending on the OS
  if (os.type() === 'Linux') {
    await exec('make', 'makefiles/lin');
  } else if (os.type() === 'Darwin') {
    await exec('make', 'makefiles/mac');
  } else if (os.type() === 'Windows_NT') {
    await exec('nmake', 'makefiles/win');
  } else {
    throw new Error(`Unsupported OS found: ${os.type()}`);
  }
})();
