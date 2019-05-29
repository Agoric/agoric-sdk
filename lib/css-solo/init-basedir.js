import fs from 'fs';
import path from 'path';

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
  ['bootstrap.js', 'gci.js', 'vat-comms.js', 'vat-http.js'].forEach(name => {
    fs.copyFileSync(path.join(source_vatdir, name),
                    path.join(dest_vatdir, name));
  });

  const initialState = {
    mailbox: undefined,
    kernel: undefined,
  };

  const stateFile = path.join(basedir, 'swingset.state');
  fs.writeFileSync(stateFile, JSON.stringify(initialState)+'\n');

  // this marker file is how we recognize css-solo basedirs
  fs.copyFileSync(path.join(here, 'solo-README-to-install.md'),
                  path.join(basedir, 'solo-README.md'));

  console.log(`css-solo initialized in ${basedir}`);
  console.log(`HTTP/WebSocket listening on port ${webport}`);
}
