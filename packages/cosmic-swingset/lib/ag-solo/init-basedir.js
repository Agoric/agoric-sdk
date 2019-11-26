import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export default function initBasedir(basedir, webport, webhost, subdir, egresses) {
  const here = __dirname;
  try {
    fs.mkdirSync(basedir);
  } catch (e) {
    if (!fs.existsSync(path.join(basedir, 'ag-cosmos-helper-address'))) {
      console.log(
        `unable to create basedir ${basedir}, it must not already exist`,
      );
      throw e;
    }
  }

  const connections = [{ type: 'http', port: webport, host: webhost }];
  fs.writeFileSync(
    path.join(basedir, 'connections.json'),
    `${JSON.stringify(connections)}\n`,
  );
  const source_htmldir = path.join(here, 'html');
  const dest_htmldir = path.join(basedir, 'html');
  fs.mkdirSync(dest_htmldir);
  fs.readdirSync(source_htmldir)
    .filter(name => name.match(/^[^.]/))
    .forEach(name => {
      fs.copyFileSync(
        path.join(source_htmldir, name),
        path.join(dest_htmldir, name),
      );
    });

  const source_contractsdir = path.join(here, 'contracts');
  const dest_contractsdir = path.join(basedir, 'contracts');
  fs.mkdirSync(dest_contractsdir);
  if (fs.existsSync(source_contractsdir)) {
    fs.readdirSync(source_contractsdir)
      .filter(name => name.match(/^[^.]/))
      .forEach(name => {
        fs.copyFileSync(
          path.join(source_contractsdir, name),
          path.join(dest_contractsdir, name),
        );
      });
  }

  // Save our version codes.
  const pj = 'package.json';
  fs.copyFileSync(path.join(`${here}/../..`, pj), path.join(dest_htmldir, pj));
  const gr = 'git-revision.txt';
  try {
    fs.copyFileSync(path.join(`${here}/..`, gr), path.join(dest_htmldir, gr));
  } catch (e) {
    const stdout = execFileSync('git', ['describe', '--always', '--dirty']);
    fs.writeFileSync(path.join(dest_htmldir, gr), stdout);
  }
  const plj = 'package-lock.json';
  try {
    fs.copyFileSync(
      path.join(`${here}/../..`, plj),
      path.join(dest_htmldir, plj),
    );
  } catch (e) {
    console.log(`Cannot copy ${plj}:`, e);
  }

  const source_vatdir = subdir
    ? path.join(here, 'vats', subdir)
    : path.join(here, 'vats');
  const dest_vatdir = path.join(basedir, 'vats');
  fs.mkdirSync(dest_vatdir);
  fs.readdirSync(source_vatdir)
    .filter(name => name.match(/\.js$/))
    .forEach(name => {
      fs.copyFileSync(
        path.join(source_vatdir, name),
        path.join(dest_vatdir, name),
      );
    });

  // Enable our node_modules to be found.
  fs.symlinkSync(
    path.resolve(here, '../../node_modules'),
    path.join(basedir, 'node_modules'),
  );

  const mailboxStateFile = path.resolve(basedir, 'swingset-mailbox-state.json');
  fs.writeFileSync(mailboxStateFile, `{}\n`);
  const kernelStateFile = path.resolve(basedir, 'swingset-kernel-state.jsonlines');
  // this contains newline-terminated lines of JSON.stringify(['key', 'value'])
  fs.writeFileSync(kernelStateFile, ``);

  // cosmos-sdk keypair
  if (egresses.includes('cosmos')) {
    const agchServerDir = path.join(basedir, 'ag-cosmos-helper-statedir');
    if (!fs.existsSync(agchServerDir)) {
      fs.mkdirSync(agchServerDir);
      // we assume 'ag-cosmos-helper' is on $PATH for now, see chain-cosmos-sdk.js
      const keyName = 'ag-solo';
      const password = 'mmmmmmmm\n';
      // we suppress stderr because it displays the mnemonic phrase, but
      // unfortunately that means errors are harder to diagnose
      execFileSync(
        'ag-cosmos-helper',
        ['keys', 'add', keyName, '--home', agchServerDir],
        {
          input: Buffer.from(password),
          stdio: ['pipe', 'ignore', 'ignore'],
        },
      );
      console.log('key generated, now extracting address');
      const kout = execFileSync(
        'ag-cosmos-helper',
        ['keys', 'show', keyName, '--address', '--home', agchServerDir],
        {
          stdio: ['ignore', 'pipe', 'inherit'],
        },
      );
      fs.writeFileSync(
        path.join(basedir, 'ag-cosmos-helper-address'),
        kout.toString(),
      );
    }
  }

  // this marker file is how we recognize ag-solo basedirs
  fs.copyFileSync(
    path.join(here, 'solo-README-to-install.md'),
    path.join(basedir, 'solo-README.md'),
  );

  console.log(`ag-solo initialized in ${basedir}`);
  console.log(`HTTP/WebSocket will listen on ${webhost}:${webport}`);
}
