import parseArgs from 'minimist';
import fs from 'fs';
import path from 'path';

import templateMain from './template';

export default async function initMain(progname, rawArgs, priv) {
  const { console, error } = priv;
  const {
    _: args,
  } = parseArgs(rawArgs);

  if (args.length !== 1) {
    error(`you must specify exactly one DIR`);
  }
  const [DIR] = args;

  const { mkdir, stat, lstat, symlink, readdir, readFile, writeFile } = fs.promises;

  console.log(`initializing ${DIR}`);
  await mkdir(DIR);

  const templateDir = `${__dirname}/../template`;
  const writeTemplate = async stem => {
    const template = await readFile(`${templateDir}${stem}`, 'utf-8');
    const content = template.replace(/['"]@DIR@['"]/g, JSON.stringify(DIR)).replace(/@DIR@/g, DIR);
    return writeFile(`${DIR}${stem}`, content);
  }

  const recursiveTemplate = async (templateDir, suffix = '') => {
    const cur = `${templateDir}${suffix}`;
    const list = await readdir(cur);
    await Promise.all(list.map(async name => {
      const stem = `${suffix}/${name}`;
      const st = await lstat(`${templateDir}${stem}`);
      let target;
      try {
        target = await stat(`${DIR}${stem}`);
      } catch (e) {}
      if (target) {
        return;
      }
      if (st.isDirectory()) {
        console.log(`mkdir ${DIR}${stem}`);
        await mkdir(`${DIR}${stem}`);
        await recursiveTemplate(templateDir, `${stem}`)
      } else {
        console.log(`write ${DIR}${stem}`);
        await writeTemplate(stem);
      }
    }));
  };
  await recursiveTemplate(templateDir);

  const agservers = path.join(DIR, '.agservers');
  await mkdir(agservers);

  const solo = path.join(agservers, 'solo');
  const chain = path.join(agservers, 'chain');
  await Promise.all([mkdir(solo), mkdir(chain)]);
  const chainSolo = path.join(chain, 'solo');
  const chainCosmos = path.join(chain, 'cosmos');
  await Promise.all([mkdir(chainSolo), mkdir(chainCosmos)]);

  // Create links to all the solo nodes' html directories.
  await Promise.all([
    mkdir(`${chainSolo}/html`),
    mkdir(`${solo}/html`),
  ])

  await Promise.all([
    symlink('../../../ui/build', `${chainSolo}/dapp-html`),
    symlink('../../ui/build', `${solo}/dapp-html`),
  ]);
}
