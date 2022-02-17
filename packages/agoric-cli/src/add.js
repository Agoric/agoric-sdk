import fs from 'fs';
import installMain from './install.js';

function subMain(fn, args, options, powers, progname) {
  return fn(progname, args, powers, options).then(
    // This seems to be the only way to propagate the exit code.
    code => process.exit(code || 0),
  );
}

export default async function addMain(progname, rawArgs, powers, opts) {
  const command = rawArgs[0];
  const workspace = rawArgs[1][0];
  if (rawArgs[1].length < 2) {
    console.error(
      'Invalid format\nUse : agoric add workspace packagesname@version',
    );
    return;
  }
  if (command === 'add') {
    const packages = rawArgs[1].slice(1)[0];
    let path = powers.process.env.PWD + '/' + workspace + '/package.json';
    let packageJson = fs.readFileSync(path, 'utf-8');
    packageJson = JSON.parse(packageJson);

    let package_version = packages.split('@');
    let packageName = package_version[0];
    const version = package_version[1];
    packageJson.dependencies[packageName.toString()] = version
      ? '^' + version
      : '*';
    packageJson = JSON.stringify(packageJson);
    fs.writeFileSync(path, packageJson, 'utf-8');
  }
}
