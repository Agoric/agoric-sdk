import process from 'process';

import {
  initGraphSpec,
  addDataToGraphSpec,
  addGraphToGraphSpec,
  renderGraph,
} from '@agoric/stat-logger';

// prettier-ignore
const colors = [
  [ '#61d836', '#88fa4e', '#1db100', '#017100' ],
  [ '#00a2ff', '#56c1ff', '#0076ba', '#004d7f' ],
  [ '#fae232', '#fffc66', '#f8ba00', '#ff9300' ],
  [ '#ff644e', '#ff968d', '#ee220c', '#b51700' ],
  [ '#ef5fa7', '#ff8dc6', '#cb297b', '#991953' ],
  [ '#16e7cf', '#73fdea', '#00a89d', '#2e578c' ],
];

export async function dataGraphApp(xField, xLabel, yField, yLabel, lineFields) {
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

  const spec = initGraphSpec(datafiles[0], xField, xLabel, yField, yLabel);
  for (let dataIdx = 0; dataIdx < datafiles.length; dataIdx += 1) {
    addDataToGraphSpec(spec, datafiles[dataIdx]);
    const groupColors = colors[dataIdx % colors.length];
    for (let lineIdx = 0; lineIdx < lineFields.length; lineIdx += 1) {
      addGraphToGraphSpec(
        spec,
        datafiles[dataIdx],
        lineFields[lineIdx],
        groupColors[lineIdx % groupColors.length],
      );
    }
  }

  await renderGraph(spec, outfile, type);
}
