import { branding, name, count } from './t-setup.js';
import { performance } from 'perf_hooks';

function f(count, body, post) {
  const before = performance.now();
  let list = {};
  for (let i = 0; i < count; i++) {
    if (body === '//nothing') {
      //nothing
    } else if (body === 'list = {next: list};') {
      list = {next: list};
    } else if (body === 'list = harden({next: list});') {
      list = harden({next: list});
    } else {
      throw Error(`unknown body '${body}'`);
    }
  }
  if (post === '//nothing') {
    // nothing
  } else if (post === 'harden(list);') {
    harden(list);
  } else {
    throw Error(`unknown post '${post}'`);
  }
  const after = performance.now();
  return(after - before);
}

const [body, post] = {
  nothing: ['//nothing', '//nothing'],
  list: ['list = {next: list};', '//nothing'],
  listHard: ['list = harden({next: list});', '//nothing'],
  hardList: ['list = {next: list};', 'harden(list);'],
}[name];

const title = `time, ${branding}, ${count}, ${name}`;
try {
  const innerTime = f(count, body, post);
  const record = {
    branding,
    count,
    name,
    innerTime,
  };
  console.log(JSON.stringify(record, undefined, ' '), '\n,\n');
} catch (e) {
  console.log(`error`, e);
  process.exit(1);
}
