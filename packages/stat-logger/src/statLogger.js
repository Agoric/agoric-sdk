import fs from 'fs';
import process from 'process';

export const makeStatLogger = (tag, headers, options) => {
  const dir = (options && options.dir) || '.';
  if (!tag) {
    tag = `${process.pid}`;
  }
  const statsPath = `${dir}/stats-${tag}`;
  const out = fs.createWriteStream(statsPath);
  out.write(headers.join('\t'));
  out.write('\n');

  const log = sample => {
    out.write(sample.join('\t'));
    out.write('\n');
  };

  const close = () => {
    out.end();
  };

  return { log, close };
};
