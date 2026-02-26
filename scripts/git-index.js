#! /usr/bin/env node
/* @ts-check */
// Pack/unpack the current Git index to/from a single file.

import '@endo/init/legacy.js';
import { execa } from 'execa';
import { makeFsStreamWriter } from '@agoric/internal/src/node/fs-stream.js';
import BufferLineTransform from '@agoric/internal/src/node/buffer-line-transform.js';
import { createReadStream } from 'node:fs';
import { parseArgs } from 'node:util';

/**
 * Parse the --stages option value into a Set of stage numbers (0-3).
 *
 * @param {string} stages
 * @returns {Set<number>}
 */
const parseStages = stages => {
  switch (stages) {
    case 'all':
      return new Set([0, 1, 2, 3]);
    case 'normal':
      return new Set([0]);
    case 'conflicted':
      return new Set([1, 2, 3]);
    default: {
      const nums = stages.split(',').map(s => {
        const n = Number(s.trim());
        if (!Number.isInteger(n) || n < 0 || n > 3) {
          throw new Error(
            `Invalid stage number "${s.trim()}". Must be 0-3, or one of: all, normal, conflicted`,
          );
        }
        return n;
      });
      return new Set(nums);
    }
  }
};

/**
 * @callback Writer
 * @param {string} data
 * @returns {Promise<void>}
 */

/**
 * @param {Record<string, any>} allOpts
 */
const splitWrapOpts = allOpts => {
  const { log, logSuffix, ...rest } = allOpts;
  return [rest, { log, logSuffix }];
};

/**
 * Wrap an execa function to support both tagged template and normal calls, and
 * to log the command in dry-run mode.
 *
 * @param {typeof execa | false | null | undefined} exe
 * @param {object} [opts]
 */
const wrap$ = (exe, opts = {}) => {
  exe ||= undefined;

  /**
   * @param {TemplateStringsArray | Record<string, any>} tmplOrOpts
   * @param  {...any} args
   */
  return (tmplOrOpts, ...args) => {
    if (!Array.isArray(tmplOrOpts)) {
      const [exeOpts, wrapOpts] = splitWrapOpts(tmplOrOpts);
      return wrap$(exe?.(exeOpts), { ...opts, ...wrapOpts });
    }

    const tmpl = /** @type {TemplateStringsArray} */ (
      /** @type {unknown} */ (tmplOrOpts)
    );

    // Would be nice if execa provided a way to get the escaped command
    // without running it, but it doesn't, so we have to reconstruct it
    // ourselves for logging in dry-run mode.
    const { log = (...largs) => console.log(...largs), logSuffix = [] } = opts;
    log(
      '$',
      [tmpl[0], ...args.flatMap((arg, idx) => [arg, tmpl[idx + 1]])].join(''),
      ...(logSuffix || []),
    );
    return exe?.(tmpl, ...args);
  };
};

/**
 * Pack all stages of the Git index into a single JSONL file.
 * Each line is a JSON object: { stage, mode, hash, path, content? }
 * where content (base64) is only present when includeBlobContent is true.
 *
 * @param {object} opts
 * @param {Writer} opts.write
 * @param {boolean} opts.wetRun
 * @param {Set<number>} opts.stages
 * @param {boolean} opts.includeBlobContent
 * @param {(...args: unknown[]) => void} opts.log
 */
const pack = async ({ write, wetRun, stages, includeBlobContent, log }) => {
  log('# Reading Git index entries');
  const ro$ = wrap$(execa, { log });
  const lsResult = await ro$`git ls-files --stage`;

  // git ls-files --stage output: "<mode> <hash> <stage>\t<path>"
  const entries = lsResult.stdout
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const tabIdx = line.indexOf('\t');
      const meta = line.slice(0, tabIdx).split(' ');
      const [mode, hash, stageStr] = meta;
      const stage = Number(stageStr);
      const path = line.slice(tabIdx + 1);
      return { mode, hash, stage, path };
    })
    .filter(e => stages.has(e.stage));

  log(
    `# Found ${entries.length} index entries matching stages [${[...stages].join(',')}]`,
  );

  let written = 0;
  /** @type {Array<{stage: number, mode: string, hash: string, path: string, content?: string}>} */
  for await (const { mode, hash, stage, path } of entries) {
    /** @type {{stage: number, mode: string, hash: string, path: string, content?: string}} */
    const record = { stage, mode, hash, path };
    await null;
    // Optionally fetch blob content for each entry.
    if (includeBlobContent) {
      const opt$ = ro$({
        encoding: 'base64',
        logSuffix: [`  # ${path} (stage ${stage})`],
      });
      const blobResult = await opt$`git cat-file blob ${hash}`;
      record.content = blobResult.stdout;
    }
    written += 1;
    wetRun && (await write(`${JSON.stringify(record)}\n`));
  }

  if (!written) {
    throw new Error(
      'No index entries found for the specified stages; refusing to write an empty file',
    );
  }
  log(`# Wrote ${written} records`);
};

/**
 * Unpack a JSONL file and apply its entries to the current Git index.
 *
 * @param {object} opts
 * @param {() => AsyncIterable<string>} opts.readLines
 * @param {boolean} opts.wetRun
 * @param {boolean} opts.replaceIndex
 * @param {(...args: unknown[]) => void} opts.log
 */
const unpack = async ({ readLines, wetRun, replaceIndex, log }) => {
  await null;
  const rw$ = wrap$(wetRun && execa, { log });

  if (replaceIndex) {
    log('# Clearing the current Git index');
    await rw$`git read-tree --empty`;
  }

  log(`# Reading records`);
  /** @type {Array<{stage: number, mode: string, hash: string, path: string, content?: string}>} */
  const records = [];
  for await (const line of readLines()) {
    if (!line.trim()) continue;
    records.push(JSON.parse(line));
  }
  log(`# Loaded ${records.length} records`);
  if (records.length === 0) {
    throw new Error('Input file is empty; refusing to modify the index');
  }

  for (const { stage, mode, hash: recordHash, path, content } of records) {
    let hash = recordHash;

    // If blob content is embedded, restore the object into the Git object store.
    if (content !== undefined) {
      const buf = Buffer.from(content, 'base64');
      const opt$ = rw$({
        input: buf,
        logSuffix: [`  # ${path} (stage ${stage})`],
      });
      const result = await opt$`git hash-object -w --stdin`;
      hash = result?.stdout.trim();
    }

    // For all stages: git update-index --add --stage=N --cacheinfo mode,hash,path
    await rw$`git update-index --add --stage=${stage} --cacheinfo ${mode},${hash},${path}`;
  }
};

/**
 * @param {object} [opts]
 * @param {string[]} [opts.args]
 * @param {(...args: unknown[]) => void} [opts.log]
 */
const main = async (opts = {}) => {
  const { args = [], log = (...logArgs) => console.log(...logArgs) } = opts;
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    args,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
        description: 'Show this help message',
      },
      'dry-run': {
        type: 'boolean',
        short: 'n',
        default: false,
        description: 'Show the commands that would be run, but do not run them',
      },
      stages: {
        type: 'string',
        default: 'conflicted',
        description:
          'Which index stages to include: all, normal (0), conflicted (1-3), or a comma-separated list of numbers 0-3 (default: conflicted)',
      },
      'with-content': {
        type: 'boolean',
        short: 'C',
        default: false,
        description:
          'Embed base64-encoded blob content in the output file (makes it self-contained)',
      },
      'replace-index': {
        type: 'boolean',
        default: false,
        description:
          'When unpacking, clear the entire index first instead of merging entries',
      },
    },
  });

  if (values.help) {
    log(`
Usage: git-index [options] <command> <file>

Commands:
  pack    Pack the current Git index into a JSONL file
  unpack  Unpack a JSONL file and apply it to the current index

Options:
    --stages=<spec>  Stages to include: all, normal, conflicted, or
                       comma-separated numbers 0-3 [conflicted]
-C, --with-content   Embed blob content to make the output self-contained
    --replace-index  When unpacking, empty the index first instead of merging (default: false)
-n, --dry-run        Show commands without executing them
-h, --help           Show this help message
    `);
    return;
  }

  const [command, file, ...rest] = positionals;
  if (command !== 'pack' && command !== 'unpack') {
    throw new Error(
      `Expected command to be "pack" or "unpack", got: ${JSON.stringify(command)}`,
    );
  }
  if (!file) {
    throw new Error('A file argument is required');
  }
  if (rest.length > 0) {
    throw new Error(`Unexpected positional arguments: ${rest.join(' ')}`);
  }

  const stages = parseStages(/** @type {string} */ (values.stages));
  const wetRun = values['dry-run'] === false;
  const includeBlobContent = /** @type {boolean} */ (values['with-content']);
  const replaceIndex = /** @type {boolean} */ (values['replace-index']);

  if (wetRun) {
    log('# Running in wet mode (state will be modified)');
  } else {
    log('# Running in dry-run mode (no state will be modified)');
  }

  await null;
  if (command === 'pack') {
    /** @type {Writer} */
    let write;

    /** @type {Awaited<ReturnType<typeof makeFsStreamWriter>>} */
    let ws;
    try {
      if (wetRun) {
        ws = await makeFsStreamWriter(file);
        write = data => ws.write(data);
      } else {
        write = async _data => {};
      }
      log(`# Will write to ${file}`);
      await pack({ write, wetRun, stages, includeBlobContent, log });
    } finally {
      if (ws) {
        await ws.close();
      }
    }
  } else if (command === 'unpack') {
    async function* readLines() {
      const asyncLines = createReadStream(file, { encoding: 'utf8' }).pipe(
        new BufferLineTransform(),
      );
      for await (const line of asyncLines) {
        yield line.toString();
      }
    }
    log(`# Will read from ${file}`);
    await unpack({ readLines, wetRun, replaceIndex, log });
  }
  log('Done!');
};

main({
  args: process.argv.slice(2),
  log: (...logArgs) => console.warn(...logArgs),
}).catch(err => {
  console.error(err);
  process.exit(process.exitCode || 1);
});
