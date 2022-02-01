/* global process setTimeout setInterval clearInterval */
/* eslint-disable no-await-in-loop */

import { E, makeCapTP } from '@endo/captp';
import { makePromiseKit } from '@agoric/promise-kit';
import bundleSource from '@endo/bundle-source';
import { search as readContainingPackageDescriptor } from '@endo/compartment-mapper';
import path from 'path';
import inquirer from 'inquirer';
import createRequire from 'esm';

import { getAccessToken } from '@agoric/access-token';

const esmRequire = createRequire({});

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
  const { anylogger, fs, makeWebSocket, now } = powers;
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

  const wsurl = `ws://${opts.hostport}/private/captp`;
  const exit = makePromiseKit();
  let connected = false;
  process.stdout.write(`Open CapTP connection to ${wsurl}...`);
  let progressDot = '.';
  const progressTimer = setInterval(
    () => process.stdout.write(progressDot),
    1000,
  );

  const retryWebsocket = async () => {
    const accessToken = await getAccessToken(opts.hostport);

    // For a WebSocket we need to put the token in the query string.
    const wsWebkey = `${wsurl}?accessToken=${encodeURIComponent(accessToken)}`;

    const ws = makeWebSocket(wsWebkey, { origin: 'http://127.0.0.1' });
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

        const pluginManager = await E.get(
          E.get(bootP).local,
        ).plugin.catch(_ => {});
        const pluginDir = await E(pluginManager)
          .getPluginDir()
          .catch(_ => {});

        if (allowUnsafePlugins && !pluginDir) {
          throw Error(
            `Installing unsafe plugins disabled; no pluginDir detected`,
          );
        }

        for (const arg of args) {
          const moduleFile = path.resolve(process.cwd(), arg);
          const pathResolve = (...resArgs) =>
            path.resolve(path.dirname(moduleFile), ...resArgs);
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
          const read = async url => fs.readFile(new URL(url).pathname);
          const {
            packageDescriptorText,
          } = await readContainingPackageDescriptor(
            read,
            `file://${moduleFile}`,
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
              pathResolve,
              installUnsafePlugin,
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
