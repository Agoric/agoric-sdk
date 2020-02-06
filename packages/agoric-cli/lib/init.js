import parseArgs from 'minimist';
import chalk from 'chalk';

export default async function initMain(progname, rawArgs, priv) {
  const { console, error, fs } = priv;
  const { _: args, force } = parseArgs(rawArgs, { boolean: ['force'] });

  if (args.length !== 1) {
    return error(`you must specify exactly one DIR`);
  }
  const [DIR] = args;

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
    name === 'node_modules' ||
    (suffix === '/.agservers' && name !== 'package.json' && name[0] !== '.');

  const writeTemplate = async (templateDir, stem) => {
    const template = await readFile(`${templateDir}${stem}`, 'utf-8');
    const content = template
      .replace(/['"]@DIR@['"]/g, JSON.stringify(DIR))
      .replace(/@DIR@/g, DIR);
    return writeFile(`${DIR}${stem}`, content);
  };

  const recursiveTemplate = async (templateDir, suffix = '') => {
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
          target = await stat(`${DIR}${stem}`);
        } catch (e) {
          if (e.code !== 'ENOENT') {
            throw e;
          }
        }
        if (st.isDirectory()) {
          if (!target) {
            console.log(`mkdir ${DIR}${stem}`);
            await mkdir(`${DIR}${stem}`);
          }
          await recursiveTemplate(templateDir, `${stem}`);
        } else if (st.isSymbolicLink()) {
          console.log(`symlink ${DIR}${stem}`);
          await symlink(
            await readlink(`${templateDir}${stem}`),
            `${DIR}${stem}`,
          );
        } else {
          console.log(`write ${DIR}${stem}`);
          await writeTemplate(templateDir, stem);
        }
      }),
    );
  };
  await recursiveTemplate(`${__dirname}/../template`);

  console.log(chalk.bold.yellow(`Done initializing`));
  return 0;
}
