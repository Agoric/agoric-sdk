/* eslint-env node */
import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { logCreator } from './context-aware-slog.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

const main = async () => {
  const [, , slogFilePath] = process.argv;

  if (!(slogFilePath && existsSync(slogFilePath)))
    throw Error(`Filepath "${slogFilePath}" not valid`);

  const inputFileStream = createReadStream(slogFilePath);

  const fileReader = createInterface({ input: inputFileStream });

  const logger = logCreator(log =>
    process.stdout.write(
      serializeSlogObj(log),
      err =>
        err &&
        console.error(
          `Unable to write line "${serializeSlogObj(log)}" due to error: `,
          err,
        ),
    ),
  );

  for await (const line of fileReader) {
    try {
      logger(JSON.parse(line));
    } catch (err) {
      console.error(`Unable to parse line "${line}" due to error: `, err);
    }
  }
};

// @ts-expect-error
global.assert = x => {
  if (!x) throw Error(`value "${x}" is not truthy`);
};

console.log(`Sample run: CHAIN_ID=<CHAIN ID> node temp.js <slog file path>`);

main().catch(err => {
  console.error('Caught error: ', err);
  process.exit(1);
});
