import path from 'path';
import process from 'process';

import {
  initGraphSpec,
  addDataToGraphSpec,
  addGraphToGraphSpec,
  renderGraph,
} from '@agoric/stat-logger';

// prettier-ignore
const colors = [
  [ '#0000ff', '#7047eb', '#9575d7', '#ada0c1' ],
  [ '#c080c0', '#d596d5', '#eaacea', '#ffc2ff' ],
  [ '#00ff00', '#66e450', '#85c872', '#96ac8e' ],
  [ '#c0c080', '#d0d277', '#e0e46b', '#eff65e' ],
  [ '#00ffff', '#52e4e4', '#6bcac9', '#78b0af' ],
  [ '#c08080', '#d59193', '#eaa2a7', '#ffb3bc' ],
  [ '#c0c000', '#e4e14e', '#c9c36d', '#aba784' ],
  [ '#80c080', '#85d586', '#89ea8d', '#8dff93' ],
  [ '#c00000', '#f35738', '#e17d64', '#c89c90' ],
  [ '#80c0c0', '#6fd5d5', '#54eaea', '#00ffff' ],
  [ '#c000c0', '#eb5ee8', '#d582d0', '#bb9cb8' ],
  [ '#8080c0', '#9ca0d5', '#bbc0ea', '#dbe1ff' ],
];

const appName = path.basename(process.argv[1]);

function usage(showFields) {
  let fieldsLine = '';
  if (showFields) {
    fieldsLine =
      '\n  --fields FIELDS - comma separated list of field names to graph';
  }

  console.log(`
Command line:
  ${appName} [FLAGS...] ARGS...

FLAGS may be:
  --output FILE   - place output in FILE (otherwise it will got to stdout)
  -o FILE         - synonym for --output
  --pdf           - generate a PDF file (PNG by default)
  --label STR     - label for a data file
  -l STR          - synonym for --label${fieldsLine}
  --help          - print this helpful usage information

ARGS consist of paths to one or more data files.  Each datafile must contain
all the fields being graphed.  Files may be labeled in the graph key with the
--label option, one --label option per file, applied in the same order as the
data file ARGS (and may be interleaved with them on the command line).
`);
}

function fail(message, printUsage, showFields) {
  console.log(message);
  if (printUsage) {
    usage(showFields);
  }
  process.exit(1);
}

export async function dataGraphApp(xField, xLabel, yField, yLabel, fields) {
  const argv = process.argv.slice(2);

  let outfile = null;
  const datafiles = [];
  const tags = [];
  let type = 'png';

  const expectFields = !fields;
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
        case '--label':
        case '-l':
          tags.push(argv.shift());
          break;
        case '--help':
          usage(expectFields);
          process.exit(0);
          break;
        case '--fields':
        case '-f':
          if (expectFields) {
            fields = argv.shift().split(',');
            break;
          }
        // note fall through to error
        default:
          fail(`invalid flag ${arg}`, true, expectFields);
      }
    } else {
      datafiles.push(arg);
      if (datafiles.length < tags.length) {
        tags.push(undefined);
      }
    }
  }
  if (!fields) {
    fail('you must specify some field names to graph', true, expectFields);
  }
  if (datafiles.length < 1) {
    fail('you must specify some input', true, expectFields);
  }

  let yFields;
  if (expectFields) {
    yFields = fields;
  } else {
    yFields = [yField];
  }

  const spec = initGraphSpec(datafiles, xField, xLabel, yFields, yLabel);
  for (let dataIdx = 0; dataIdx < datafiles.length; dataIdx += 1) {
    addDataToGraphSpec(spec, datafiles[dataIdx]);
    const groupColors = colors[dataIdx % colors.length];
    for (let lineIdx = 0; lineIdx < fields.length; lineIdx += 1) {
      addGraphToGraphSpec(
        spec,
        tags[dataIdx],
        datafiles[dataIdx],
        fields[lineIdx],
        groupColors[lineIdx % groupColors.length],
      );
    }
  }

  await renderGraph(spec, outfile, type);
}
