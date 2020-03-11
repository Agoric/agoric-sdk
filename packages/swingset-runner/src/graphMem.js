import fs from 'fs';
import path from 'path';
import process from 'process';

import { initGraphSpec, addDataToGraphSpec, addGraphToGraphSpec, renderGraph } from '@agoric/stat-logger';

const colors = [
  '#00a2ff', '#56c1ff', '#0076ba', '#004d7f',
  '#61d836', '#88fa4e', '#1db100', '#017100',
  '#fae232', '#fffc66', '#f8ba00', '#ff9300',
  '#ff644e', '#ff968d', '#ee220c', '#b51700',
  '#ef5fa7', '#ff8dc6', '#cb297b', '#991953',
  '#16e7cf', '#73fdea', '#00a89d', '#2e578c',
];

export async function main() {
  const argv = process.argv.splice(2);

  let outfile = null;
  const datafiles = [];

  while (argv[0]) {
    const arg = argv.shift();
    if (arg.startsWith('-')) {
      switch (arg) {
        case '--output':
        case '-o':
          outfile = argv.shift();
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

  if (!outfile) {
    outfile = datafiles[0];
  }
  if (!outfile.endsWith('.png')) {
    outfile += '.png';
  }

  const spec = initGraphSpec(datafiles[0], 'block', 'Block #', 'rss', 'Memory usage');
  let colorIdx = 0;
  for (let i = 0; i < datafiles.length; ++i) {
    colorIdx = colorIdx % colors.length;
    addDataToGraphSpec(spec, datafiles[i]);
    addGraphToGraphSpec(spec, datafiles[i], 'rss', colors[colorIdx++]);
    addGraphToGraphSpec(spec, datafiles[i], 'heapTotal', colors[colorIdx++]);
    addGraphToGraphSpec(spec, datafiles[i], 'heapUsed', colors[colorIdx++]);
    addGraphToGraphSpec(spec, datafiles[i], 'external', colors[colorIdx++]);
  }

  await renderGraph(spec, outfile);
}
