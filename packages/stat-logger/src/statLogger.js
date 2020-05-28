import fs from 'fs';
import process from 'process';

export function makeStatLogger(tag, headers, options) {
  const dir = (options && options.dir) || '.';
  if (!tag) {
    tag = `${process.pid}`;
  }
  const statsPath = `${dir}/stats-${tag}`;
  const out = fs.createWriteStream(statsPath);
  out.write(headers.join('\t'));
  out.write('\n');

  function log(sample) {
    out.write(sample.join('\t'));
    out.write('\n');
  }

  function close() {
    out.end();
  }

  return { log, close };
}
