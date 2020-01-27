#! /usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

(async argv => {
  const script = argv[0] || '/usr/local/bin/agoric';
  const content = `\
#! /bin/sh
exec ${path.resolve(__dirname, '../packages/agoric-cli/bin/agoric')} --sdk \${1+"\$@"}
`;
  console.log(`creating ${script}`);
  await fs.writeFile(script, content);
  await fs.chmod(script, '0755');
})(process.argv.slice(2)).then(
  ret => process.exit(ret || 0),
  err => {
    console.error(err);
    process.exit(1);
  }
);
