import fs from 'fs';
import process from 'process';

export function makeStatLogger(tag, headers, options) {
  const dir = (options && options.dir) || '.';
  const statsPath = `${dir}/stats-${tag}-${process.pid}`;
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
