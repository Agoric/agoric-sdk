#! /usr/bin/env node
/* eslint-env node */
// crunch.mjs - crunch a kvstore trace file's writes into TSV

import fs from 'fs';
import ReadlineTransform from 'readline-transform';

const [TRACE_FILE, FIRST_BLOCK_HEIGHT = 0, LAST_BLOCK_HEIGHT = Infinity] =
  process.argv.slice(2);
if (!TRACE_FILE) {
  console.error(
    'usage: crunch trace-file [first-block-height [last-block-height]]',
  );
  process.exit(1);
}

const escapeCharCode = c => {
  switch (c) {
    // backslash-escape the following characters
    case 92:
      return '\\\\';
    case 10:
      return '\\n';
    case 13:
      return '\\r';
    case 9:
      return '\\t';
    case 0:
      return '\\0';
    default: {
      if (c < 0x20 || c > 0x7e) {
        return `\\x${c.toString(16).padStart(2, '0')}`;
      }
      return String.fromCharCode(c);
    }
  }
};

const decode = b64 => {
  const b = Buffer.from(b64, 'base64');
  return Array.from(b).map(escapeCharCode).join('');
};

const main = async () => {
  const rl = new ReadlineTransform();
  fs.createReadStream(TRACE_FILE).pipe(rl);

  for await (const line of rl) {
    const { operation, key, value, metadata } = JSON.parse(line);
    if (operation !== 'write') {
      continue;
    }
    if (!metadata || metadata.blockHeight < FIRST_BLOCK_HEIGHT) {
      continue;
    }
    if (metadata && metadata.blockHeight > LAST_BLOCK_HEIGHT) {
      break;
    }
    const decodedKey = decode(key);
    if (decodedKey.match(/^\w+\/fwd\/0x[0-9a-f]+$/)) {
      // Probably capability module.
      continue;
    }

    const decodedValue = decode(value);
    const obj = { operation, key: decodedKey, value: decodedValue, metadata };

    // Write a tab-separated line of key, value, metadata.
    process.stdout.write(
      `${obj.key}\t${obj.value}\t${JSON.stringify(obj.metadata)}\n`,
    );
  }
};

await main();
