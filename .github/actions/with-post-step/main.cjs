// Ref: https://github.com/pyTooling/Actions/blob/main/with-post-step/main.js
const { spawn } = require('child_process');
const { appendFileSync } = require('fs');
const { EOL } = require('os');

const run = cmd => {
  const subprocess = spawn(cmd, { stdio: 'inherit', shell: true });
  subprocess.on('exit', exitCode => {
    process.exitCode = exitCode;
  });
};

const key = process.env.INPUT_KEY.toUpperCase();

if (process.env[`STATE_${key}`] !== undefined) {
  // Are we in the 'post' step?
  run(process.env.INPUT_POST);
} else {
  // Otherwise, this is the main step
  appendFileSync(process.env.GITHUB_STATE, `${key}=true${EOL}`);
  run(process.env.INPUT_MAIN);
}
