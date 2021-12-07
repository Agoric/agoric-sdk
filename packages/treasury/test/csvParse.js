// ack: https://stackoverflow.com/a/18147076/7963
export const fieldPattern = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;

export const unquote = field =>
  field
    .replace(/""/g, '"')
    .replace(/^"/, '')
    .replace(/"$/, '');

export const splitFields = line =>
  [...line.matchAll(fieldPattern)].map(([_all, txt]) => unquote(txt));

export const csvParse = content => content.split('\n').map(splitFields);
