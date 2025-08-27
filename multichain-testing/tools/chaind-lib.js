// @ts-check
// import { makeTracer } from '@agoric/internal';
import assert from 'node:assert';
import { toCLIOptions } from '@agoric/internal/src/cli-utils.js';

/**Add commentMore actions
 * @typedef {{ event: string, condition?: '=', value: string }} EventQuery
 */

// const trace = makeTracer('Agd', false);
// Was disabled in https://github.com/Agoric/agoric-sdk/commit/b6b7c2b850e4af84fb65366b5d12196e012c41e1 so commented out the usage.
// Will un-comment with generic chainD option once we decide to enable trace again.

const { freeze } = Object;

const kubectlBinary = 'kubectl';

const chainToBinary = {
  agoric: 'agd',
  cosmoshub: 'gaiad',
  osmosis: 'osmosisd',
  noble: 'nobled',
};

/**
 * @param {string} chainName
 * @returns {string[]} - e.g. ['exec', '-i', 'agoriclocal-genesis-0', '-c', 'validator', '--tty=false', '--', 'agd']
 */
const binaryArgs = (chainName = 'agoric') => [
  'exec',
  '-i',
  `${chainName}local-genesis-0`,
  '-c',
  'validator',
  '--request-timeout=300s',
  '--tty=false',
  '--',
  chainToBinary[chainName],
];

/**
 * @callback ExecSync
 * @param {string} file
 * @param {string[]} args
 * @param {{ encoding: 'utf-8' } & { [k: string]: unknown }} opts
 * @returns {string}
 */

/**
 * @param {{ execFileSync: typeof import('node:child_process')['execFileSync'] }} io
 * 
 * 
 */

// const execFileSyncCustom = (execFileSync, ...args) => {

//   // console.log("Executing execFileSyncCustom", ...args);
//   // const out = execFileSync('kubectl', ['config', 'view', '--minify', '-o','jsonpath="{.contexts[0].context.namespace}"'], {
//   //         encoding: 'utf-8',
//   //         stdio: ['ignore', 'pipe', 'pipe'],
//   // })
//   // console.log("OUTPUT: ",out);

//   try {
//     return execFileSync(...args);
//   }
//   catch (err) {
//     console.error("err", err);
//     console.error('stderr:', err.stderr?.toString());
//     console.error('stdout (partial):', err.stdout?.toString());
//   }
//   return null
// }
export const makeAgd = ({ execFileSync }) => {
  /**
   * @param { {
   *       home?: string;
   *       keyringBackend?: string;
   *       rpcAddrs?: string[];
   *       chainName?: string;
   *       broadcastMode?: 'block' | 'sync' | 'async';
   *     }} opts
   */
  const make = ({
    home,
    keyringBackend,
    rpcAddrs,
    chainName = 'agoric',
    broadcastMode = 'block',
  } = {}) => {
    const keyringArgs = toCLIOptions({
      home,
      'keyring-backend': keyringBackend,
    });
    if (rpcAddrs) {
      assert.equal(
        rpcAddrs.length,
        1,
        'XXX rpcAddrs must contain only one entry',
      );
    }
    const nodeArgs = toCLIOptions({ node: rpcAddrs && rpcAddrs[0] });

    /**
     * @param {string[]} args
     * @param {*} [opts]
     * @param {boolean} [interactive]
     */
    const exec = (
      args,
      opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
      interactive = true,
    ) => {
      let _binaryArgs = binaryArgs(chainName);
      if (!interactive) {
        _binaryArgs = _binaryArgs.filter(arg => arg !== '-i');
      }

      return execFileSync(kubectlBinary, [..._binaryArgs, ...args], opts);
    }

    // replace only this function
    /**
     * @param {string[]} args
     * @param {*} [opts]
     */
    const exec2 = (
  args,
  opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
) => {
  // POSIX-safe single-quote escaping
  const shEscape = s =>
    `'${String(s).replace(/'/g, `'\\''`)}'`;

  // Build: kubectl <binaryArgs> <args>  (all escaped)
  const full = [
    kubectlBinary,
    ...binaryArgs(chainName),
    ...args,
  ].map(shEscape).join(' ');

  // Run through /bin/sh so we can merge stderr -> stdout
  // NOTE: we keep your opts (encoding etc.)
  const out = execFileSync('/bin/sh', ['-c', `${full} 2>&1`], opts);

  // Return combined stdout+stderr as a string (like before)
  return typeof out === 'string' ? out : out?.toString?.() ?? '';
};


    const outJson = toCLIOptions({ output: 'json' });

    /** @type {Record<string, any> | undefined} */
    let version;

    /** @type {((ev: EventQuery | EventQuery[]) => string[]) | undefined} */
    let buildEventQueryArgs;

    const ro = freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      version: async () => {
        if (version) {
          return version;
        }

        // This hack (2>&1) is because some appds write version to stderr!
        // TODO: Instead figure out reading version from chain's RPC endpoint instead of stderr (https://github.com/Agoric/agoric-sdk/issues/11496).
        const kubectlArgs = binaryArgs(chainName);
        const appd = kubectlArgs.pop();
        const args = [
          `/bin/sh`,
          `-c`,
          `exec ${appd} version --long --output json 2>&1`,
        ];

        console.log(`$$$`, ...args);
        const out = execFileSync(kubectlBinary, [...kubectlArgs, ...args], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        const splitOutput = out.split('\n');
        const lastLine = splitOutput.at(-1) || splitOutput.at(-2);

        try {
          assert(lastLine, 'no last line');
          version = JSON.parse(lastLine);
          return version;
        } catch (e) {
          console.error(chainName, 'version failed:', e);
          console.info('output:', out);
          throw e;
        }
      },
      /**
       *
       * @param {[EventQuery, ...EventQuery[]]} eventQueries
       * @returns {Promise<any>}
       */
      queryTxsByEvents: async (...eventQueries) => {
        const doQuery = () => {
          assert(buildEventQueryArgs, 'buildEventQueryArgs not set');
          return ro.query([
            'txs',
            ...eventQueries.flatMap(buildEventQueryArgs),
          ]);
        };

        if (buildEventQueryArgs) {
          return doQuery();
        }

        // Default to v0.50: chaind txs --query "<QUERY>"
        buildEventQueryArgs = evs => {
          const evqArr = Array.isArray(evs) ? evs : [evs];
          return [
            '--query',
            evqArr
              .map(({ event, condition, value }) => {
                if (condition !== undefined) {
                  assert.equal(
                    condition,
                    '=',
                    `condition: ${condition} unimplemented; only "=" supported`,
                  );
                }
                return `${event}='${value}'`;
              })
              .join(' AND '),
          ];
        };

        // Extract version from: chaind version --long -ojson
        const version = await ro.version();
        assert(version, `no ${chainName} version`);
        if (version.cosmos_sdk_version.match(/^v0\.[0-4]?[0-9]\./)) {
          // Pre v0.50.0.
          buildEventQueryArgs = evs => {
            const evqArr = Array.isArray(evs) ? evs : [evs];
            return [
              '--events',
              evqArr
                .map(({ event, condition, value }) => {
                  if (condition !== undefined) {
                    assert.equal(
                      condition,
                      '=',
                      `condition: ${condition} unimplemented; only "=" supported`,
                    );
                  }
                  return `${event}=${value}`;
                })
                .join('&'),
            ];
          };
        }

        return doQuery();
      },
      /**
       * @param {| [kind: 'gov', domain: string, ...rest: any]
       *         | [kind: 'tx', txhash: string]
       *         | [mod: 'vstorage', kind: 'data' | 'children', path: string]
       *         | [kind: 'txs', ...rest: any]
       * } qArgs
       */
      query: async qArgs => {
        let pipeArgs = [];
        if (qArgs.includes('--count-total')) {
          pipeArgs = ['|', 'jq', '-r', "'.pagination.total'"];
        }
        const args = ['query', ...qArgs, ...nodeArgs, ...outJson, ...pipeArgs];
        console.log(`$$$ ${chainToBinary[chainName]}`, ...args);
        const out = exec(args, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }, false);

        console.log("QUERY_ARGS", qArgs);
        console.log("QUERY_OUTPUT", out);

        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
      // query2: async qArgs => {
      //   let pipeArgs = [];
      //   // if (qArgs.includes('--count-total')) {
      //   //   pipeArgs = ['|', 'jq', '-r', "'.pagination.total'"];
      //   // }
      //   const args = ['query', ...qArgs, ...nodeArgs, ...outJson, ...pipeArgs];
      //   console.log(`$$$ ${chainToBinary[chainName]}`, ...args);
      //   const out = exec2(args, {
      //     encoding: 'utf-8',
      //     stdio: ['ignore', 'pipe', 'pipe'],
      //   });

      //   console.log("QUERY_ARGS", qArgs);
      //   console.log("QUERY_OUTPUT", out);

      //   try {
      //     return JSON.parse(out);
      //   } catch (e) {
      //     console.error(e);
      //     console.info('output:', out);
      //   }
      // },
      query3: async qArgs => {
  // detect special jq modes
  const wantLastObj = qArgs.includes('--last-proposal');
  const wantLastId  = qArgs.includes('--last-proposal-id');
  const wantCount   = qArgs.includes('--count-total');

  // build the base agd args (no jq here)
  const baseArgs = ['query', ...qArgs.filter(a => a !== '--last-proposal' && a !== '--last-proposal-id'), ...nodeArgs, ...outJson];

  // If we’re not piping, run normally (no shell)
  if (!wantLastObj && !wantLastId && !wantCount) {
    console.log(`$$$ ${chainToBinary[chainName]}`, ...baseArgs);
    const out = exec(baseArgs, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      return JSON.parse(out);
    } catch (e) {
      console.error(e);
      console.info('output:', out);
      return undefined;
    }
  }

  // We need a shell to support pipes (jq). Build a single command string.
  const kubectlArgs = binaryArgs(chainName);         // e.g. ['exec','-i','agoriclocal-genesis-0','-c','validator','--tty=false','--','agd']
  const appd = kubectlArgs.pop();                    // 'agd'
  const safeJoin = arr => arr.map(x => `'${String(x).replace(/'/g, `'\\''`)}'`).join(' ');

  // jq filters
  // last proposal object: minimal fields; adjust if you want more
  const jqLastObj = `.proposals | last | {proposal_id: .proposal_id, status: .status, title: (.content.title // .title // empty)}`
  const jqLastId  = `.proposals | last | .proposal_id // .id`
  const jqCount   = `.pagination.total`

  let jqExpr;
  let rawOutput = false; // -r only when emitting a raw string (id or count)
  if (wantLastId) {
    jqExpr = jqLastId;
    rawOutput = true;
  } else if (wantCount) {
    jqExpr = jqCount;
    rawOutput = true;
  } else {
    jqExpr = jqLastObj;
    rawOutput = false;
  }

  const jqCmd = rawOutput ? `jq -r '${jqExpr}'` : `jq '${jqExpr}'`;

  // Full shell command string
  const agdCmdStr = `exec ${appd} ${safeJoin(baseArgs)} | ${jqCmd}`;

  // Execute via /bin/sh -lc so the pipe is honored
  const shellArgs = [...kubectlArgs, '/bin/sh', '-lc', agdCmdStr];
  console.log(`$$$ sh -lc`, agdCmdStr);

  const out = exec(shellArgs, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

  // If we emitted raw (string/number), just return as-is; else parse JSON
  console.log("rawOutput", rawOutput)
  if (rawOutput) {
    return out.trim();
  }
  try {
    return JSON.parse(out);
  } catch (e) {
    console.error(e);
    console.info('output:', out);
    return undefined;
  }
},

    });
    const nameHub = freeze({
      /**
       * NOTE: synchronous I/O
       *
       * @param {string[]} path
       */
      lookup: (...path) => {
        if (!Array.isArray(path)) {
          // TODO: use COND || Fail``
          throw TypeError();
        }
        if (path.length !== 1) {
          throw Error(`path length limited to 1: ${path.length}`);
        }
        const [name] = path;
        const txt = exec(['keys', 'show', `--address`, name, ...keyringArgs]);
        return txt.trim();
      },
    });
    const rw = freeze({
      /**
       * TODO: gas
       * @param {string[]} txArgs
       * @param {{ chainId: string; from: string; yes?: boolean, fees?: string }} opts
       */
      tx: async (txArgs, { chainId, from, yes, fees }) => {
        const args = [
          'tx',
          ...txArgs,
          ...nodeArgs,
          ...keyringArgs,
          ...toCLIOptions({ 'chain-id': chainId, from }),
          ...toCLIOptions({
            'broadcast-mode': broadcastMode,
            gas: 'auto',
            'gas-adjustment': '1.4',
          }),
          ...(fees ? ['--fees', fees] : []),
          ...(yes ? ['--yes'] : []),
          ...outJson,
        ];
        console.log(`$$$ ${chainToBinary[chainName]}`, ...args);
        const out = exec(args, { stdio: ['ignore', 'pipe', 'pipe'] });
        try {
          // XXX approximate type
          /** @type {{ height: string, txhash: string, code: number, codespace: string, raw_log: string }} */
          const detail = JSON.parse(out);
          // trace('agd returned;', detail);
          if (detail.code !== 0) {
            // FIXME we're getting: account sequence mismatch, expected 30, got 29: incorrect account sequence
            // Does that mean `broadcast-mode: block` didn't work?
            throw Error(detail.raw_log);
          }
          return detail;
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
      ...ro,
      ...nameHub,
      readOnly: () => ro,
      nameHub: () => nameHub,
      keys: {
        /**
         * @param {string} name
         * @param {string} mnemonic
         */
        add: (name, mnemonic) => {
          return execFileSync(
            kubectlBinary,
            [
              ...binaryArgs(chainName),
              ...keyringArgs,
              'keys',
              'add',
              name,
              '--recover',
            ],
            {
              encoding: 'utf-8',
              input: mnemonic,
              stdio: ['pipe', 'pipe', 'ignore'],
            },
          ).toString();
        },
        /** @param {string} name key name in keyring */
        showAddress: name => {
          return execFileSync(
            kubectlBinary,
            [
              ...binaryArgs(chainName),
              'keys',
              'show',
              name,
              '-a',
              ...keyringArgs,
            ],
            {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'ignore'],
            },
          )
            .toString()
            .trim();
        },
        /** @param {string} name */
        delete: name => {
          return exec([...keyringArgs, 'keys', 'delete', name, '-y'], {
            stdio: ['pipe', 'pipe', 'ignore'],
          });
        },
      },
      /**
       * @param {Record<string, unknown>} opts
       */
      withOpts: opts => make({ home, keyringBackend, rpcAddrs, ...opts }),
    });
    return rw;
  };
  return make();
};

/** @typedef {ReturnType<typeof makeAgd>} Agd */

/** @param {{ execFileSync: typeof import('child_process').execFileSync, log: typeof console.log }} powers */
export const makeCopyFiles = (
  { execFileSync, log },
  {
    podName = 'agoriclocal-genesis-0',
    containerName = 'validator',
    destDir = '/tmp/contracts',
  } = {},
) => {
  /** @param {string[]} paths } */
  return paths => {
    // Create the destination directory if it doesn't exist
    execFileSync(
      kubectlBinary,
      `exec -i ${podName} -c ${containerName} -- mkdir -p ${destDir}`.split(
        ' ',
      ),
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    for (const path of paths) {
      execFileSync(
        kubectlBinary,
        `cp ${path} ${podName}:${destDir}/ -c ${containerName}`.split(' '),
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      log(`Copied ${path} to ${destDir} in pod ${podName}`);
    }
    const lsOutput = execFileSync(
      kubectlBinary,
      `exec -i ${podName} -c ${containerName}  -- ls ${destDir}`.split(' '),
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' },
    );
    log(`ls ${destDir}:\n${lsOutput}`);
    return lsOutput;
  };
};
