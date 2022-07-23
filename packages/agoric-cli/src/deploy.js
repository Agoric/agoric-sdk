/* global process setTimeout setInterval clearInterval */
/* eslint-disable no-await-in-loop */

import { E, makeCapTP } from '@endo/captp';
import { makePromiseKit } from '@endo/promise-kit';
import bundleSource from '@endo/bundle-source';
import { makeCache } from '@agoric/cache';
import { makeLeaderFromRpcAddresses } from '@agoric/casting';
import { search as readContainingPackageDescriptor } from '@endo/compartment-mapper';
import url from 'url';
import path from 'path';
import http from 'http';
import inquirer from 'inquirer';
import chalk from 'chalk';
import tmp from 'tmp';
import createEsmRequire from 'esm';
import { createRequire } from 'module';

import { getAccessToken } from '@agoric/access-token';

import {
  makeBundlePublisher,
  makeCosmosBundlePublisher,
  makeHttpBundlePublisher,
} from './publish.js';
import { makeJsonHttpClient } from './json-http-client-node.js';
import { makePspawn, getSDKBinaries } from './helpers.js';

const { details: X } = assert;

const require = createRequire(import.meta.url);
const esmRequire = createEsmRequire({});

// note: CapTP has its own HandledPromise instantiation, and the contract
// must use the same one that CapTP uses. We achieve this by not bundling
// captp, and doing a (non-isolated) dynamic import of the deploy script
// below, so everything uses the same module table. The eventual-send that
// our captp uses will the same as the one the deploy script imports, so
// they'll get identical HandledPromise objects.

// TODO: clean this up: neither captp nor eventual-send will export
// HandledPromise, eventual-send should behave a shims, whoever imports it
// first will cause HandledPromise to be added to globalThis. And actually
// HandledPromise will go away in favor of globalThis.Promise.delegate

const RETRY_DELAY_MS = 1000;

const PATH_SEP_RE = new RegExp(`${path.sep.replace(/\\/g, '\\\\')}`, 'g');

export default async function deployMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, spawn, makeWebSocket, now } = powers;
  const console = anylogger('agoric:deploy');

  const allowUnsafePlugins = opts.allowUnsafePlugins;
  if (allowUnsafePlugins) {
    const { yesReally } = await inquirer.prompt([
      {
        name: 'yesReally',
        message: `Enable unsafe (unconfined) plugins for this deployment?  Type 'yes' if you are sure:`,
        default: 'no',
      },
    ]);
    if (yesReally !== 'yes') {
      console.error(
        `Aborting (if you wish to continue unsafely, you must type 'yes' exactly)!`,
      );
      process.exit(1);
    }
  }

  const args = rawArgs.slice(1);
  const provide = opts.provide
    .split(',')
    .map(dep => dep.trim())
    .filter(dep => dep)
    .sort();

  const sdkPrefixes = {};
  if (!opts.sdk) {
    // TODO importMetaResolve should be more reliable.
    const agoricPrefix = path.resolve(`node_modules/@agoric`);
    sdkPrefixes.goPfx = agoricPrefix;
    sdkPrefixes.jsPfx = agoricPrefix;
  }

  const need = opts.need
    .split(',')
    .map(dep => dep.trim())
    .filter(dep => dep && !provide.includes(dep))
    .sort();

  const sendJSON = (ws, obj) => {
    if (ws.readyState !== ws.OPEN) {
      return;
    }
    const body = JSON.stringify(obj);
    console.debug('sendJSON', body.slice(0, 200));
    ws.send(body);
  };

  const match = opts.hostport.match(/^(.*):(\d+)$/);
  const host = match ? match[1] : 'localhost';
  const port = match ? match[2] : '8000';

  const wsurl = opts.hostport.includes('//')
    ? new URL(opts.hostport, 'ws://localhost:8000')
    : new URL(`ws://${host}:${port}`);

  const myPort =
    wsurl.port || (['https:', 'wss:'].includes(wsurl.protocol) ? '443' : '80');

  assert.equal(wsurl.pathname, '/', X`${opts.hostport} cannot contain a path`);
  wsurl.pathname = '/private/captp';

  const exit = makePromiseKit();
  let connected = false;
  process.stdout.write(`Open CapTP connection to ${wsurl}...`);
  let progressDot = '.';
  const progressTimer = setInterval(
    () => process.stdout.write(progressDot),
    1000,
  );

  const jsonHttpCall = makeJsonHttpClient({ http });

  const listConnections = async () => {
    const accessToken = await getAccessToken(`${wsurl.hostname}:${myPort}`);

    const { ok, connections } = await jsonHttpCall({
      hostname: host,
      port,
      method: 'GET',
      path: `/connections?accessToken=${encodeURIComponent(accessToken)}`,
    });
    assert(
      ok === true,
      `Expected JSON body "ok" property to be true for HTTP request for chain connections`,
    );
    return connections;
  };

  const getDefaultConnection = async () => {
    let connections = await listConnections();

    const filterOptions = {
      __proto__: null,
      local: ['http'],
      sim: ['fake-chain'],
      cosmos: ['chain-cosmos-sdk'],
    };
    const defaultFilter = [...filterOptions.sim, ...filterOptions.cosmos];
    filterOptions.agoric = defaultFilter;

    let filterChoice = defaultFilter;
    if (opts.target !== undefined) {
      filterChoice = filterOptions[opts.target];
      assert(
        filterChoice !== undefined,
        `Invalid --target ${opts.target}, must be one of agoric, cosmos, sim, or local`,
      );
    }

    connections = connections.filter(({ type }) => filterChoice.includes(type));

    assert(
      connections.length > 0,
      `Cannot find any chain connections in local solo.`,
    );
    if (connections.length === 1) {
      return connections[0];
    }
    assert(
      process.stdin.isTTY,
      `Multiple connection options. Please use the --target flag or an interactive terminal.`,
    );
    console.log('\nConnection options:');
    const lookup = new Map(
      connections.map((connection, index) => {
        console.log(`${index + 1}.`, connection);
        return [`${index + 1}`, connection];
      }),
    );
    const { connectionNumber } = await inquirer.prompt({
      name: 'connectionNumber',
      message: 'Please choose a connection to publish to',
      choices: lookup.keys(),
    });
    const connection = lookup.get(connectionNumber);
    console.log({ connection });
    return connection;
  };

  const pspawnEnv = { ...process.env, DEBUG: 'agoric,deploy,deploy:publish' };
  const pspawn = makePspawn({ env: pspawnEnv, spawn, log: console, chalk });
  const { cosmosHelper } = getSDKBinaries(sdkPrefixes);
  const publishBundleCosmos = makeCosmosBundlePublisher({
    pspawn,
    cosmosHelper,
    pathResolve: path.resolve,
    writeFile: fs.writeFile,
    tmpDirSync: tmp.dirSync,
    random: Math.random,
  });
  const publishBundleHttp = makeHttpBundlePublisher({
    getAccessToken,
    jsonHttpCall,
  });
  const publishBundle = makeBundlePublisher({
    getDefaultConnection,
    publishBundleCosmos,
    publishBundleHttp,
  });

  const retryWebsocket = async () => {
    const accessToken = await getAccessToken(`${wsurl.hostname}:${myPort}`);

    // For a WebSocket we need to put the token in the query string.
    const wsWebkey = `${wsurl}?accessToken=${encodeURIComponent(accessToken)}`;

    const ws = makeWebSocket(wsWebkey, { origin: wsurl.origin });
    ws.on('open', async () => {
      connected = true;
      try {
        console.debug('Connected to CapTP!');
        // Help disambiguate connections.
        const epoch = now();
        const { dispatch, getBootstrap } = makeCapTP(
          'bundle',
          obj => sendJSON(ws, obj),
          undefined,
          {
            epoch,
          },
        );
        ws.on('message', data => {
          try {
            const obj = JSON.parse(data);
            console.debug('receiving', data.slice(0, 200));
            if (obj.type === 'CTP_ERROR') {
              throw obj.error;
            }
            dispatch(obj);
          } catch (e) {
            console.error('server error processing message', data, e);
            exit.reject(e);
          }
        });

        // Wait for the chain to become ready.
        let bootP = getBootstrap();
        let lastUpdateCount;
        let stillLoading = [...need].sort();
        progressDot = 'o';
        while (stillLoading.length) {
          // Wait for the notifier to report a new state.
          process.stdout.write(progressDot);
          console.debug('need:', stillLoading.join(', '));
          const update = await E(E.get(bootP).loadingNotifier).getUpdateSince(
            lastUpdateCount,
          );
          lastUpdateCount = update.updateCount;

          // Skip the deploy if our provides are not needed.
          let needsProvide = !provide.length;
          const notNeeded = [];
          for (const dep of provide) {
            if (update.value.includes(dep)) {
              needsProvide = true;
            } else {
              notNeeded.push(dep);
            }
          }
          if (!needsProvide) {
            console.info(`Don't need our provides: ${notNeeded.join(', ')}`);
            process.exit(0);
          }

          const nextLoading = [];
          for (const dep of stillLoading) {
            if (update.value.includes(dep)) {
              // A dependency is still loading.
              nextLoading.push(dep);
            }
          }
          stillLoading = nextLoading;
        }

        clearInterval(progressTimer);
        process.stdout.write('\n');
        console.debug(JSON.stringify(need), 'loaded');
        // Take a new copy, since the chain objects have been added to bootstrap.
        bootP = getBootstrap();

        const pluginManager = await E.get(E.get(bootP).local).plugin.catch(
          _ => {},
        );
        const pluginDir = await E(pluginManager)
          .getPluginDir()
          .catch(_ => {});

        if (allowUnsafePlugins && !pluginDir) {
          throw Error(
            `Installing unsafe plugins disabled; no pluginDir detected`,
          );
        }

        const cache = makeCache(
          E(E(E.get(bootP).wallet).getBridge()).getCacheCoordinator(),
        );

        let cachedLeader;
        const makeDefaultLeader = async leaderOptions => {
          if (cachedLeader === undefined) {
            const conn = await getDefaultConnection();
            const { type, rpcAddresses } = conn;
            assert.equal(
              type,
              'chain-cosmos-sdk',
              X`${type} doesn't support casting followers`,
            );
            cachedLeader = makeLeaderFromRpcAddresses(
              rpcAddresses,
              leaderOptions,
            );
          }
          return cachedLeader;
        };

        for (const arg of args) {
          const moduleFile = path.resolve(process.cwd(), arg);
          const pathResolve = (...paths) => {
            const fileName = paths.pop();
            try {
              return require.resolve(fileName, {
                paths: [...paths, path.dirname(moduleFile)],
              });
            } catch (e) {
              return path.resolve(path.dirname(moduleFile), ...paths, fileName);
            }
          };
          console.warn('running', moduleFile);

          let installUnsafePlugin;
          if (!allowUnsafePlugins) {
            installUnsafePlugin = async (plugin, _opts = undefined) => {
              throw Error(
                `Installing unsafe plugin ${JSON.stringify(
                  pathResolve(plugin),
                )} disabled; maybe you meant '--allow-unsafe-plugins'?`,
              );
            };
          } else {
            installUnsafePlugin = async (plugin, pluginOpts = undefined) => {
              try {
                const absPath = pathResolve(plugin);
                const pluginName = absPath.replace(PATH_SEP_RE, '_');
                const pluginFile = path.resolve(pluginDir, pluginName);

                // Just create a little redirector for that path.
                console.warn(
                  `Installing unsafe plugin ${JSON.stringify(absPath)}`,
                );
                const content = `\
// ${pluginFile}
// AUTOMATICALLY GENERATED BY ${JSON.stringify(
                  [progname, ...rawArgs].join(' '),
                )}
export { bootPlugin } from ${JSON.stringify(absPath)};
`;
                await fs.writeFile(pluginFile, content);

                // Return the bootstrap object for this plugin.
                console.info(`Loading plugin ${JSON.stringify(pluginFile)}`);
                return E.get(E(pluginManager).load(pluginName, pluginOpts))
                  .pluginRoot;
              } catch (e) {
                throw Error(
                  `Cannot install unsafe plugin: ${(e && e.stack) || e}`,
                );
              }
            };
          }

          // Use a dynamic import to load the deploy script.
          // It is unconfined.

          // Use Node.js ESM support if package.json of template says "type":
          // "module".
          const read = async location =>
            fs.readFile(url.fileURLToPath(location));
          const { packageDescriptorText } =
            await readContainingPackageDescriptor(
              read,
              url.pathToFileURL(moduleFile),
            ).catch(cause => {
              throw new Error(
                `Expected a package.json beside deploy script ${moduleFile}, ${cause}`,
                { cause },
              );
            });
          const packageDescriptor = JSON.parse(packageDescriptorText);
          const nativeEsm = packageDescriptor.type === 'module';
          console.log(
            `Deploy script will run with ${
              nativeEsm ? 'Node.js ESM' : 'standardthings/esm emulation'
            }`,
          );

          const modulePath = pathResolve(moduleFile);
          const mainNS = nativeEsm
            ? await import(modulePath)
            : esmRequire(modulePath);
          const main = mainNS.default;
          if (typeof main !== 'function') {
            console.error(
              `${moduleFile} does not have an export default function main`,
            );
          } else {
            await main(bootP, {
              bundleSource: (file, options = undefined) =>
                bundleSource(pathResolve(file), options),
              cache,
              makeDefaultLeader,
              publishBundle,
              listConnections,
              pathResolve,
              installUnsafePlugin,
              /**
               * Recursively look up names in the context of the bootstrap
               * promise, such as:
               *
               * ['agoricNames', 'oracleBrand', 'USD']
               * ['namesByAddress']
               * ['namesByAddress', 'agoric1...']
               * ['namesByAddress', 'agoric1...', 'depositFacet']
               * ['wallet', 'issuer', 'IST']
               *
               * @param  {...string[]} namePath
               * @returns {Promise<any>}
               */
              lookup: (...namePath) => {
                if (namePath.length === 1 && Array.isArray(namePath[0])) {
                  // Convert single array argument to a path.
                  namePath = namePath[0];
                }
                if (namePath.length === 0) {
                  return bootP;
                }
                const [first, ...remaining] = namePath;

                // The first part of the name path is a property on bootP.
                let nextValue = E.get(bootP)[first];
                if (remaining.length === 0) {
                  return nextValue;
                }

                // Compatibility for agoricdev-8; use `.get` for the next part.
                // TODO: remove when agoricdev-9 is released.
                if (first === 'scratch') {
                  const second = remaining.shift();
                  const secondValue = E(nextValue).get(second);
                  if (remaining.length === 0) {
                    return secondValue;
                  }

                  // Fall through to the lookup below.
                  nextValue = secondValue;
                }

                // Any remaining paths go through the lookup method of the found
                // object.
                return E(nextValue).lookup(...remaining);
              },
              host,
              port,
              args: opts.scriptArgs,
            });
          }
        }

        if (provide.length) {
          console.debug('provide:', provide.join(', '));
          await E(E.get(E.get(bootP).local).http).doneLoading(provide);
        }

        console.debug('Done!');
        ws.close();
        exit.resolve(0);
      } catch (e) {
        exit.reject(e);
      }
    });
    ws.on('close', (_code, _reason) => {
      console.debug('connection closed');
      if (connected) {
        exit.resolve(1);
      }
    });
    ws.on('error', e => {
      if (e.code === 'ECONNREFUSED' && !connected) {
        // Retry in a little bit.
        setTimeout(retryWebsocket, RETRY_DELAY_MS);
        return;
      }
      exit.reject(e);
    });
  };
  // Start the retry process.
  retryWebsocket();
  return exit.promise;
}
