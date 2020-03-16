import process from 'process';

import {
  initGraphSpec,
  addDataToGraphSpec,
  addGraphToGraphSpec,
  renderGraph,
} from '@agoric/stat-logger';

const colors = [
  '#61d836',
  '#00a2ff',
  '#fae232',
  '#ff644e',
  '#ef5fa7',
  '#16e7cf',
];

export async function main() {
  const argv = process.argv.splice(2);

  let outfile = null;
  const datafiles = [];
  let type = 'png';

  while (argv[0]) {
    const arg = argv.shift();
    if (arg.startsWith('-')) {
      switch (arg) {
        case '--output':
        case '-o':
          outfile = argv.shift();
          break;
        case '--pdf':
          type = 'pdf';
          break;
        default:
          throw new Error(`invalid flag ${arg}`);
      }
    } else {
      datafiles.push(arg);
    }
  }
  if (datafiles.length < 1) {
    throw new Error('you must specify some input');
  }

  const spec = initGraphSpec(
    datafiles[0],
    'block',
    'Block #',
    'btime',
    'Block time (ns)',
  );
  for (let i = 0; i < datafiles.length; i += 1) {
    addDataToGraphSpec(spec, datafiles[i]);
    addGraphToGraphSpec(spec, datafiles[i], 'btime', colors[i % colors.length]);
  }

  await renderGraph(spec, outfile, type);
}
