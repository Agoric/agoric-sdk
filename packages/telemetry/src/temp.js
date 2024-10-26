/* eslint-env node */
import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { makeContextualSlogProcessor } from './context-aware-slog.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

const main = async () => {
  const [, , slogFilePath] = process.argv;

  if (!(slogFilePath && existsSync(slogFilePath)))
    throw Error(`Filepath "${slogFilePath}" not valid`);

  const inputFileStream = createReadStream(slogFilePath);

  const fileReader = createInterface({ input: inputFileStream });

  const logger = makeContextualSlogProcessor({
    'chain-id': process.env.CHAIN_ID,
  });

  for await (const line of fileReader) {
    try {
      const logRecord = logger(JSON.parse(line));
      process.stdout.write(
        serializeSlogObj(logRecord),
        err =>
          err &&
          console.error(
            `Unable to write line "${serializeSlogObj(logRecord)}" due to error: `,
            err,
          ),
      );
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
