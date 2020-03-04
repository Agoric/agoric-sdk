import parseArgs from 'minimist';
import chalk from 'chalk';

const DEFAULT_DAPP_TEMPLATE = '@agoric/dapp-simple-exchange';

export default async function initMain(progname, rawArgs, priv, opts) {
  const { console, error, fs } = priv;
  const { _: args, force, 'dapp-template': dappTemplate } = parseArgs(rawArgs, {
    boolean: ['force'],
    default: { 'dapp-template': DEFAULT_DAPP_TEMPLATE },
  });

  if (args.length !== 1) {
    return error(`you must specify exactly one DIR`);
  }
  const [DIR] = args;

  const slashPJson = '/package.json';
  const pjson = require.resolve(`${dappTemplate}${slashPJson}`);
  const dappRoot = pjson.substr(0, pjson.length - slashPJson.length);

  const {
    mkdir,
    stat,
    lstat,
    symlink,
    readdir,
    readFile,
    readlink,
    writeFile,
  } = fs;

  console.log(`initializing ${DIR}`);
  try {
    await mkdir(DIR);
  } catch (e) {
    if (!force) {
      throw e;
    }
  }

  const isIgnored = (suffix, name) =>
    name === 'node_modules' || suffix === '/_agstate';

  const writeTemplate = async (templateDir, destDir = DIR, stem) => {
    const template = await readFile(`${templateDir}${stem}`, 'utf-8');
    const content = template
      .replace(/['"]@DIR@['"]/g, JSON.stringify(DIR))
      .replace(/@DIR@/g, DIR);
    return writeFile(`${destDir}${stem}`, content);
  };

  const recursiveTemplate = async (templateDir, destDir = DIR, suffix = '') => {
    const cur = `${templateDir}${suffix}`;
    const list = await readdir(cur);
    await Promise.all(
      list.map(async name => {
        const stem = `${suffix}/${name}`;
        if (isIgnored(suffix, name)) {
          return;
        }
        const st = await lstat(`${templateDir}${stem}`);
        let target;
        try {
          target = await stat(`${destDir}${stem}`);
        } catch (e) {
          if (e.code !== 'ENOENT') {
            throw e;
          }
        }
        if (st.isDirectory()) {
          if (!target) {
            console.log(`mkdir ${destDir}${stem}`);
            await mkdir(`${destDir}${stem}`);
          }
          await recursiveTemplate(templateDir, destDir, `${stem}`);
        } else if (st.isSymbolicLink()) {
          console.log(`symlink ${destDir}${stem}`);
          await symlink(
            await readlink(`${templateDir}${stem}`),
            `${destDir}${stem}`,
          );
        } else {
          console.log(`write ${destDir}${stem}`);
          await writeTemplate(templateDir, destDir, stem);
        }
      }),
    );
  };
  await recursiveTemplate(dappRoot);
  await mkdir(`${DIR}/_agstate`);

  const ps = ['', 'api/', 'contract/', 'ui/'].map(dir => {
    const path = `${DIR}/${dir}package.json`;
    return readFile(path, 'utf-8')
      .then(contents => JSON.parse(contents))
      .then(pkg => {
        if (!pkg.name || !pkg.name.startsWith(dappTemplate)) {
          throw Error(
            `${path}: "name" must start with ${JSON.stringify(dappTemplate)}`,
          );
        }
        pkg.name = `${DIR}${pkg.name.substr(dappTemplate.length)}`;
        const json = JSON.stringify(pkg, undefined, 2);
        return writeFile(path, json);
      })
      .catch(e => console.error(chalk.bold.blue(`Cannot rewrite ${path}`), e));
  });

  await Promise.all(ps);

  console.log(chalk.bold.yellow(`Done initializing`));
  return 0;
}
