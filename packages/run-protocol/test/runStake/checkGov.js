import '@endo/init';
import * as farExports from '@endo/far';

const check = code => {
  // const permit = true;
  // const powers = {};
  const modules = {}; // TODO

  // Inspired by ../repl.js:
  const globals = harden({
    ...modules,
    ...farExports,
    assert,
    console,
  });

  // Evaluate the code in the context of the globals.
  const compartment = new Compartment(globals);
  harden(compartment.globalThis);
  return compartment.evaluate(code);
};

const main = async (argv, { readFile, stdout }) => {
  const [_node, _script, fn] = argv;
  const text = await readFile(fn, 'utf-8');
  const clean = text
    .replace(/\bimport\s*\(/g, 'importX(') // avoid SES_IMPORT_REJECTED
    .replace(/[\t ]+$/g, ''); // trailing whitespace disrupts YAML formatting
  const withURL = `${clean}\n//#sourceURL=${fn}\n`;
  check(withURL);
  stdout.write(withURL);
};

/* global process */
main([...process.argv], {
  readFile: (await import('fs/promises')).readFile,
  stdout: process.stdout,
}).catch(err => {
  process.exitCode = 1;
  console.error(err);
});
