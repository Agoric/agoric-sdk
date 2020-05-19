import fs from 'fs';
import path from 'path';
import * as vega from 'vega';

export function initGraphSpec(statsPath, xField, xLabel, yField, yLabel) {
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 1500,
    height: 800,
    padding: 5,
    background: 'white',

    data: [
      {
        name: 'legend',
        values: [],
      },
    ],

    scales: [
      {
        name: 'x',
        type: 'linear',
        range: 'width',
        nice: true,
        domain: { data: statsPath, field: xField },
      },
      {
        name: 'y',
        type: 'linear',
        range: 'height',
        nice: true,
        zero: true,
        domain: { data: statsPath, field: yField },
      },
      {
        name: 'legend',
        type: 'ordinal',
        domain: { data: 'legend', field: 'text' },
        range: { data: 'legend', field: 'color' },
      },
    ],

    axes: [
      { orient: 'bottom', scale: 'x', title: xLabel },
      { orient: 'left', scale: 'y', title: yLabel },
    ],

    marks: [],

    legends: [
      {
        type: 'symbol',
        symbolType: 'stroke',
        fill: 'legend',
        direction: 'vertical',
        orient: 'top-left',
        rowPadding: 0,
        clipHeight: 0,
        titleOrient: 'top',
        symbolStrokeWidth: 2,
        symbolSize: 1000,
        stroke: 'legend',
      },
    ],
  };
  return spec;
}

export function addDataToGraphSpec(spec, statsPath) {
  const dataElement = {
    name: statsPath,
    format: { type: 'tsv' },
    url: `file://${statsPath}`,
  };
  spec.data.push(dataElement);
}

export function addGraphToGraphSpec(spec, tag, statsPath, yField, color) {
  if (!tag) {
    tag = path.basename(statsPath);
  }
  const legendElement = {
    text: `${tag} - ${yField}`,
    color,
  };
  spec.data[0].values.push(legendElement);
  const lineElement = {
    type: 'line',
    from: { data: statsPath },
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

export async function renderGraph(spec, outputPath, type = 'png') {
  if (spec.data.length === 0) {
    throw new Error('graph spec contains no data');
  } else if (spec.marks.length === 0) {
    throw new Error('graph spec has no graphs defined');
  }
  if (type !== 'png' && type !== 'pdf') {
    throw new Error(`invalid output type ${type}, valid types are png or pdf`);
  }

  let loadDir = '.';
  let out = process.stdout;
  if (outputPath) {
    loadDir = path.dirname(outputPath);
    if (!outputPath.endsWith(`.${type}`)) {
      outputPath += `.${type}`;
    }
    out = fs.createWriteStream(outputPath);
  }

  const view = new vega.View(vega.parse(spec, null), {
    loader: vega.loader({ baseURL: loadDir }),
    logger: vega.logger(vega.Warn, 'error'),
    renderer: 'none',
  }).finalize();

  let stream;
  if (type === 'png') {
    const canvas = await view.toCanvas();
    stream = canvas.createPNGStream();
  } else {
    const canvas = await view.toCanvas(1, {
      type: 'pdf',
      context: { textDrawingMode: 'glyph' },
    });
    stream = canvas.createPDFStream();
  }
  stream.on('data', chunk => {
    out.write(chunk);
  });
}
