// @ts-check

const dieTrying = () => {
  throw Error();
};

/**
 *
 * @param {string[]} argv
 * @param {object} io
 * @param {typeof import('fs').promises.readFile} io.readFile
 * @param {typeof import('fs').promises.writeFile} io.writeFile
 */
const main = async (argv, { readFile, writeFile }) => {
  const dest = argv.shift() || dieTrying();
  const mainFn = argv.pop() || dieTrying();
  const parts = [];
  for await (const fn of argv) {
    const txt = await readFile(fn, 'utf-8');
    parts.push(txt.replace(/^export /gm, ''));
  }
  const txt = await readFile(mainFn, 'utf-8');
  const script = txt.replace(/import {[^}]*} from [^;]+;/m, parts.join('\n'));

  await writeFile(dest, script);
  console.info('built', dest, 'from', mainFn, 'with', argv);
};

(async () => {
  // eslint-disable-next-line no-undef
  const { argv } = process;
  import('fs').then(fs => main(argv.slice(2), fs.promises));
})().catch(err => console.error(err));
