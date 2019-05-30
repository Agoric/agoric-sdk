import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export default function initBasedir(basedir, webport) {
  const here = __dirname;
  console.log('here', here);
  try {
    fs.mkdirSync(basedir);
  } catch(e) {
    console.log(`unable to create basedir ${basedir}, it must not already exist`);
    throw e;
  }
  const connections = [ { type: 'http', port: webport } ];
  fs.writeFileSync(path.join(basedir, 'connections.json'),
                   JSON.stringify(connections)+'\n');
  const source_htmldir = path.join(here, 'html');
  const dest_htmldir = path.join(basedir, 'html');
  fs.mkdirSync(dest_htmldir);
  ['index.html', 'main.js'].forEach(name => {
    fs.copyFileSync(path.join(source_htmldir, name),
                    path.join(dest_htmldir, name));
  });

  const source_vatdir = path.join(here, 'vats');
  const dest_vatdir = path.join(basedir, 'vats');
  fs.mkdirSync(dest_vatdir);
  ['bootstrap.js', 'gci.js', 'vat-comms.js', 'vat-http.js', 'vat-mint.js'].forEach(name => {
    fs.copyFileSync(path.join(source_vatdir, name),
                    path.join(dest_vatdir, name));
  });

  const initialState = {
    mailbox: undefined,
    kernel: undefined,
  };

  const stateFile = path.join(basedir, 'swingstate.json');
  fs.writeFileSync(stateFile, JSON.stringify(initialState)+'\n');

  // cosmos-sdk keypair
  const sscliServerDir = path.join(basedir, 'sscli-statedir');
  fs.mkdirSync(sscliServerDir);
  // we assume 'sscli' is on $PATH for now, see chain-cosmos-sdk.js
  const keyName = 'css-solo';
  const password = 'mmmmmmmm\n';
  // we suppress stderr because it displays the mnemonic phrase, but
  // unfortunately that means errors are harder to diagnose
  execFileSync('sscli', ['keys', 'add', keyName,
                         '--home', sscliServerDir,
                        ],
               {
                 input: Buffer.from(password),
                 stdio: ['pipe', 'ignore', 'ignore'],
               });
  console.log('key generated, now extracting address');
  const kout = execFileSync('sscli', ['keys', 'show', keyName, '--address',
                                      '--home', sscliServerDir],
                            {
                              stdio: ['ignore', 'pipe', 'inherit'],
                            });
  fs.writeFileSync(path.join(basedir, 'sscli-address'), kout.toString());

  // this marker file is how we recognize css-solo basedirs
  fs.copyFileSync(path.join(here, 'solo-README-to-install.md'),
                  path.join(basedir, 'solo-README.md'));

  console.log(`css-solo initialized in ${basedir}`);
  console.log(`HTTP/WebSocket listening on port ${webport}`);
}
