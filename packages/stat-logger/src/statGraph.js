import fs from 'fs';
import path from 'path';
import * as vega from 'vega';

export function initGraphSpec(statsPath, xField, xLabel, yField, yLabel) {
  const tag = path.basename(statsPath);
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 1500,
    height: 800,
    padding: 5,
    background: 'white',

    data: [],

    scales: [
      {
        name: 'x',
        type: 'linear',
        range: 'width',
        nice: true,
        domain: { data: tag, field: xField },
      },
      {
        name: 'y',
        type: 'linear',
        range: 'height',
        nice: true,
        zero: true,
        domain: { data: tag, field: yField },
      },
    ],

    axes: [
      { orient: 'bottom', scale: 'x', title: xLabel },
      { orient: 'left', scale: 'y', title: yLabel },
    ],

    marks: [],
  };
  return spec;
}

export function addDataToGraphSpec(spec, statsPath) {
  const tag = path.basename(statsPath);
  const dataElement = {
    name: tag,
    format: { type: 'tsv' },
    url: `file://${statsPath}`,
  };
  spec.data.push(dataElement);
}

export function addGraphToGraphSpec(spec, statsPath, yField, color) {
  const tag = path.basename(statsPath);
  const lineElement = {
    type: 'line',
    from: { data: tag },
    encode: {
      enter: {
        x: { scale: 'x', field: spec.scales[0].domain.field },
        y: { scale: 'y', field: yField },
        stroke: { value: color },
        strokeWidth: { value: 2 },
      },
    },
  };
  spec.marks.push(lineElement);
}

export async function renderGraph(spec, outputPath) {
  if (spec.data.length === 0) {
    throw new Error('graph spec contains no data');
  } else if (spec.marks.length === 0) {
    throw new Error('graph spec has no graphs defined');
  }
  if (!outputPath.endsWith('.png')) {
    outputPath += '.png';
  }

  const view = new vega.View(vega.parse(spec, null), {
    loader: vega.loader({ baseURL: path.dirname(outputPath) }),
    logger: vega.logger(vega.Warn, 'error'),
    renderer: 'none',
  }).finalize();

  const canvas = await view.toCanvas();
  const out = fs.createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.on('data', chunk => {
    out.write(chunk);
  });
}
