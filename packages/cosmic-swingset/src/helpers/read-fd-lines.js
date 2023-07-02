// @ts-check
import fs from 'fs';
import readline from 'readline';

const debug = (..._args) => {}; // console.error(..._args);

export const makeReadlineLoop = async (fd, handler) => {
  const rl = readline.createInterface({
    input: fs.createReadStream('<input-fd>', { fd, autoClose: false }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    debug(`Received: ${line}`);
    handler(line);
  }
};
