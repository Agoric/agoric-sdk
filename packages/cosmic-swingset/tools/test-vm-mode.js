// Run explicitly in CI; unlike unit tests this starts a real single-validator chain.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import TOML from '@iarna/toml';

/**
 * @typedef {ReturnType<typeof TOML.parse> & {
 *   rpc: { laddr: string },
 *   p2p: { laddr: string, pex: boolean },
 *   consensus: { timeout_commit: string },
 *   statesync: { rpc_servers: string, trust_height: number, trust_hash: string }
 * }} CometConfig
 */

const main = async () => {
  await null;
  const mode = process.argv[2];
  assert(
    ['embedded', 'split'].includes(mode),
    'usage: test-vm-mode.js embedded|split',
  );
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const artifacts = path.resolve(
    process.env.VM_TEST_ARTIFACTS ||
      (await fs.mkdtemp(path.join(os.tmpdir(), 'vm-mode-'))),
  );
  await fs.mkdir(artifacts, { recursive: true });
  const home = path.join(artifacts, 'chain');
  const target = path.join(artifacts, 'bootstrap');
  const configPath = path.join(artifacts, 'swingset.json');
  await fs.writeFile(
    configPath,
    JSON.stringify({
      bootstrap: 'bootstrap',
      vats: {
        bootstrap: {
          sourceSpec: fileURLToPath(
            new URL('../test/fixtures/vm-mode-bootstrap.js', import.meta.url),
          ),
        },
      },
      defaultManagerType: 'xs-worker',
    }),
  );
  const env = {
    ...process.env,
    CHAIN_BOOTSTRAP_VAT_CONFIG: configPath,
    AGVM_INPUT_FD: undefined,
    AGVM_OUTPUT_FD: undefined,
    AGD_EMBEDDED_VM: undefined,
    DEBUG: 'agoric:debug',
  };
  const modeFlags = [`--split-vm=${mode === 'split'}`];
  const chainID = `vm-${mode}`;
  let commandNumber = 0;
  const children = new Set();
  const launch = (args, commandHome = home) => {
    commandNumber += 1;
    const label = `${commandNumber}-${args[0]}`;
    const logPath = path.join(artifacts, `${label}.log`);
    const log = createWriteStream(logPath);
    const child = spawn(
      path.join(root, 'bin/agd'),
      [...args, `--home=${commandHome}`],
      {
        cwd: root,
        env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    assert(child.pid, 'agd must spawn successfully');
    const { pid } = child;
    children.add(child);
    let stdout = '';
    child.stdout.on('data', data => {
      stdout += data;
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    const exited = once(child, 'close').then(async ([code, signal]) => {
      await null;
      children.delete(child);
      log.end();
      await once(log, 'finish');
      return { code, signal };
    });
    return { child, pid, exited, logPath, output: () => stdout };
  };
  const run = async (args, commandHome = home) => {
    await null;
    const command = launch(args, commandHome);
    const timeout = setTimeout(
      () => process.kill(-command.pid, 'SIGKILL'),
      120_000,
    );
    try {
      assert.deepEqual(
        await command.exited,
        { code: 0, signal: null },
        `command ${args.join(' ')}; see ${command.logPath}`,
      );
      return command.output();
    } finally {
      clearTimeout(timeout);
    }
  };
  const freePort = async () => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address === 'object');
    const { port } = address;
    await new Promise(resolve => server.close(resolve));
    return port;
  };
  const rpcPort = await freePort();
  const p2pPort = await freePort();
  const rpc = `http://127.0.0.1:${rpcPort}`;
  const get = async route => {
    const response = await fetch(`${rpc}/${route}`, {
      signal: AbortSignal.timeout(2000),
    });
    assert(response.ok);
    const body = await response.json();
    assert(!body.error, JSON.stringify(body.error));
    return body.result;
  };
  const waitForHeight = async (command, minimum) => {
    await null;
    const deadline = performance.now() + 120_000;
    while (performance.now() < deadline) {
      assert(
        command.child.exitCode === null && command.child.signalCode === null,
        `chain exited; see ${command.logPath}`,
      );
      try {
        const status = await get('status');
        if (Number(status.sync_info.latest_block_height) >= minimum)
          return status;
      } catch {
        /* Startup has not exposed RPC yet. */
      }
      await delay(200);
    }
    throw Error(
      `chain did not reach height ${minimum}; see ${command.logPath}`,
    );
  };
  const start = () =>
    launch([
      'start',
      ...modeFlags,
      '--grpc.enable=false',
      '--api.enable=false',
      '--minimum-gas-prices=0ubld',
    ]);
  const stop = async command => {
    await null;
    command.child.kill('SIGINT');
    const timeout = setTimeout(
      () => process.kill(-command.pid, 'SIGKILL'),
      15_000,
    );
    try {
      // The signal handler uses 98; in split mode the SDK's normal return can
      // also win that race. Require the handshake below in either case.
      const exit = await command.exited;
      assert.equal(
        exit.signal,
        null,
        `shutdown failed; see ${command.logPath}`,
      );
      assert(
        (mode === 'split' ? [0, 98] : [98]).includes(exit.code),
        `unexpected shutdown ${exit.code}; see ${command.logPath}`,
      );
      const log = await fs.readFile(command.logPath, 'utf8');
      assert.doesNotMatch(
        log,
        /premature VM exit|RPC service stopped.*Error|RPC transport failed/,
      );
      if (mode === 'split') {
        assert.match(log, /RPC shutdown starting/);
        assert.match(log, /RPC service stopped/);
      } else assert.match(log, /Shutting down cleanly/);
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    await run([
      'init',
      'validator',
      `--chain-id=${chainID}`,
      '--default-denom=ubld',
    ]);
    await run([
      'keys',
      'add',
      'validator',
      '--keyring-backend=test',
      '--output=json',
    ]);
    const address = (
      await run(['keys', 'show', 'validator', '--keyring-backend=test', '-a'])
    ).trim();
    await run(['add-genesis-account', address, '1000000000000ubld']);
    await run([
      'gentx',
      'validator',
      '100000000ubld',
      '--keyring-backend=test',
      `--chain-id=${chainID}`,
    ]);
    await run(['collect-gentxs']);
    const configFile = path.join(home, 'config/config.toml');
    const config = /** @type {CometConfig} */ (
      TOML.parse(await fs.readFile(configFile, 'utf8'))
    );
    config.rpc.laddr = `tcp://127.0.0.1:${rpcPort}`;
    config.p2p.laddr = `tcp://127.0.0.1:${p2pPort}`;
    config.p2p.pex = false;
    config.consensus.timeout_commit = '200ms';
    await fs.writeFile(configFile, TOML.stringify(config));
    let chain = start();
    const status = await waitForHeight(chain, 4);
    assert.equal(status.node_info.network, chainID);
    const value = JSON.parse(
      await run([
        'query',
        'vstorage',
        'data',
        'published.vmMode',
        `--node=${rpc}`,
        '--output=json',
      ]),
    );
    assert.equal(value.value, 'bridge-ready');
    await stop(chain);
    const exportDir = path.join(artifacts, 'export');
    const exportFile = path.join(artifacts, 'export.json');
    await run([
      'export',
      ...modeFlags,
      `--export-dir=${exportDir}`,
      `--output-document=${exportFile}`,
    ]);
    const exported = JSON.parse(await fs.readFile(exportFile, 'utf8'));
    assert(
      Number(exported.initial_height) >= 5,
      'export must resume after committed blocks',
    );
    assert(exported.app_state.swingset, 'export includes SwingSet state');
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(exportDir, 'swing-store/export-manifest.json'),
        'utf8',
      ),
    );
    assert(
      manifest.artifacts.some(([name]) => name.startsWith('snapshot.')),
      'export includes XS snapshots',
    );
    assert(
      manifest.artifacts.some(([name]) => name.startsWith('transcript.')),
      'export includes transcripts',
    );
    // Finite embedded commands must exit reliably while Node is still alive.
    // A second fresh export also verifies that the first left reusable state.
    const repeatedExportFile = path.join(artifacts, 'export-repeat.json');
    await run([
      'export',
      ...modeFlags,
      `--export-dir=${path.join(artifacts, 'export-repeat')}`,
      `--output-document=${repeatedExportFile}`,
    ]);
    const repeatedExport = JSON.parse(
      await fs.readFile(repeatedExportFile, 'utf8'),
    );
    assert.deepEqual(repeatedExport.app_state, exported.app_state);
    await fs.cp(home, target, { recursive: true });
    // Keep application and SwingStore state, but reconstruct consensus state via
    // a light client against the original node. No explicit --height: the command
    // must open the real application to discover its committed height.
    for (const name of ['blockstore.db', 'state.db', 'cs.wal'])
      await fs.rm(path.join(target, 'data', name), {
        recursive: true,
        force: true,
      });
    chain = start();
    const resumed = await waitForHeight(
      chain,
      Number(exported.initial_height) + 3,
    );
    const trustHeight = Number(resumed.sync_info.latest_block_height) - 1;
    const block = await get(`block?height=${trustHeight}`);
    config.statesync.rpc_servers = `${rpc},${rpc}`;
    config.statesync.trust_height = trustHeight;
    config.statesync.trust_hash = block.block_id.hash;
    await fs.writeFile(
      path.join(target, 'config/config.toml'),
      TOML.stringify(config),
    );
    const bootstrapOutput = await run(
      ['comet', 'bootstrap-state', ...modeFlags],
      target,
    );
    assert.match(
      bootstrapOutput,
      /cannot verify appHash/,
      'light-client bootstrap must run',
    );
    await stop(chain);
    console.log(
      `${mode}: startup, bridge storage, block progression, restart, export, bootstrap-state, and shutdown passed; artifacts: ${artifacts}`,
    );
  } finally {
    for (const child of children) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* Already exited. */
      }
    }
  }
};

await main();
