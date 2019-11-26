import parseArgs from 'minimist';
import fs from 'fs';
import chalk from 'chalk';

export default async function initMain(progname, rawArgs, priv) {
  const { console, error } = priv;
  const {
    _: args,
    force,
  } = parseArgs(rawArgs, { boolean: ['force'] });

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
    writeFile,
  } = fs.promises;

  console.log(`initializing ${DIR}`);
  try {
    await mkdir(DIR);
  } catch (e) {
    if (!force) {
      throw e;
    }
  }

  const templateDir = `${__dirname}/../template`;
  const writeTemplate = async stem => {
    const template = await readFile(`${templateDir}${stem}`, 'utf-8');
    const content = template
      .replace(/['"]@DIR@['"]/g, JSON.stringify(DIR))
      .replace(/@DIR@/g, DIR);
    return writeFile(`${DIR}${stem}`, content);
  };

  const recursiveTemplate = async (templateDir, suffix = '') => {
    const cur = `${templateDir}${suffix}`;
    const list = await readdir(cur);
    await Promise.all(list.map(async name => {
      if (name === 'node_modules') {
        return;
      }
      const stem = `${suffix}/${name}`;
      const st = await lstat(`${templateDir}${stem}`);
      let target;
      try {
        target = await stat(`${DIR}${stem}`);
      } catch (e) {}
      if (st.isDirectory()) {
        if (!target) {
          console.log(`mkdir ${DIR}${stem}`);
          await mkdir(`${DIR}${stem}`);
        }
        await recursiveTemplate(templateDir, `${stem}`)
      } else {
        console.log(`write ${DIR}${stem}`);
        await writeTemplate(stem);
      }
    }));
  };
  await recursiveTemplate(templateDir);

  console.log(chalk.bold.yellow(`Done initializing`));
}
