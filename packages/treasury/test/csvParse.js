// @ts-check
// ack: https://stackoverflow.com/a/18147076/7963
export const fieldPattern = /("(?:(?:"")*[^"]*)*"|[^",\n]*)(?:,|\n|$)/g;

/** @param { string } field */
export const unquote = field =>
  field
    .replace(/""/g, '"')
    .replace(/^"/, '')
    .replace(/"$/, '');

/** @param { string } line */
export const splitFields = line =>
  [...line.matchAll(fieldPattern)].map(([_all, txt]) => unquote(txt));

/** @param { string } content */
export const parse = content => content.split('\n').map(splitFields);
