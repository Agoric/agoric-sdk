import test from 'ava';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initProgram } from '../../src/cli/cli.js';

const dir = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(dir, '../../src/cli/index.js');

const collectStdErr = (cmd: string[]) =>
  new Promise(resolve => {
    const child = spawn('node', cmd);
    let stderr = '';

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', () => {
      resolve(stderr);
    });
  });

const collectStdOut = (cmd: string[]) =>
  new Promise(resolve => {
    const child = spawn('node', cmd);
    let stdout = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.on('close', () => {
      resolve(stdout);
    });
  });

const mockConfig = () => {
  let initArgs: any[];
  let updateArgs: any[];
  let showArgs: any[];
  return {
    init: async (...args: any[]) => {
      initArgs = args;
    },
    update: async (...args: any[]) => {
      updateArgs = args;
    },
    show: async (...args: any[]) => {
      showArgs = args;
    },
    getInitArgs: () => initArgs,
    getUpdateArgs: () => updateArgs,
    getShowArgs: () => showArgs,
  };
};

const mockTransfer = () => {
  let transferArgs: any[];
  return {
    transfer: async (...args: any[]) => {
      transferArgs = args;
    },
    getTransferArgs: () => transferArgs,
  };
};

test('CLI shows help when run without arguments', async t => {
  const output = await collectStdErr([CLI_PATH]);
  // Replace home path (e.g. "/home/samsiegart/.fast-usdc") with "~/.fast-usdc" so snapshots work on different machines.
  const regex = /"\/home\/[^/]+\/\.fast-usdc\/"/g;
  const result = (output as string).replace(regex, '"~/.fast-usdc"');

  t.snapshot(result);
});

test('CLI shows help for transfer command', async t => {
  const output = await collectStdOut([CLI_PATH, 'transfer', '-h']);

  t.snapshot(output);
});

test('CLI shows help for config command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', '-h']);

  t.snapshot(output);
});

test('CLI shows help for config init command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', 'init', '-h']);

  t.snapshot(output);
});

test('CLI shows help for config update command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', 'update', '-h']);

  t.snapshot(output);
});

test('CLI shows help for config show command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', 'show', '-h']);

  t.snapshot(output);
});

test('CLI shows error when config init command is run without options', async t => {
  const output = await collectStdErr([CLI_PATH, 'config', 'init']);

  t.snapshot(output);
});

test('CLI shows error when config init command is run without eth seed', async t => {
  const output = await collectStdErr([
    CLI_PATH,
    'config',
    'init',
    '--noble-seed',
    'foo',
  ]);

  t.snapshot(output);
});

test('CLI calls config init with default args', t => {
  const homeDir = './test/.fast-usdc/';
  const config = mockConfig();
  const program = initProgram(config, mockTransfer());

  program.parse([
    'node',
    CLI_PATH,
    '--home',
    homeDir,
    'config',
    'init',
    '--noble-seed',
    'foo',
    '--eth-seed',
    'bar',
  ]);

  t.deepEqual(config.getInitArgs(), [
    './test/.fast-usdc/',
    './test/.fast-usdc/config.json',
    {
      agoricApi: '127.0.0.1:1317',
      ethRpc: '127.0.0.1:8545',
      ethSeed: 'bar',
      nobleRpc: '127.0.0.1:26657',
      nobleSeed: 'foo',
      nobleApi: '127.0.0.1:1318',
      nobleToAgoricChannel: 'channel-21',
      tokenMessengerAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
      tokenContractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
  ]);
});

test('CLI calls config init with optional args', t => {
  const homeDir = './test/.fast-usdc/';
  const config = mockConfig();
  const program = initProgram(config, mockTransfer());

  program.parse([
    'node',
    CLI_PATH,
    '--home',
    homeDir,
    'config',
    'init',
    '--noble-seed',
    'foo',
    '--eth-seed',
    'bar',
    '--agoric-api',
    '127.0.0.1:1111',
    '--eth-rpc',
    '127.0.0.1:2222',
    '--noble-rpc',
    '127.0.0.1:3333',
    '--noble-api',
    '127.0.0.1:4444',
    '--noble-to-agoric-channel',
    'channel-101',
    '--token-messenger-address',
    '0xmessenger123',
    '--token-contract-address',
    '0xtoken123',
  ]);

  t.deepEqual(config.getInitArgs(), [
    './test/.fast-usdc/',
    './test/.fast-usdc/config.json',
    {
      agoricApi: '127.0.0.1:1111',
      ethRpc: '127.0.0.1:2222',
      ethSeed: 'bar',
      nobleRpc: '127.0.0.1:3333',
      nobleSeed: 'foo',
      nobleApi: '127.0.0.1:4444',
      nobleToAgoricChannel: 'channel-101',
      tokenMessengerAddress: '0xmessenger123',
      tokenContractAddress: '0xtoken123',
    },
  ]);
});

test('CLI calls config update with args', t => {
  const homeDir = './test/.fast-usdc/';
  const config = mockConfig();
  const program = initProgram(config, mockTransfer());

  program.parse([
    'node',
    CLI_PATH,
    '--home',
    homeDir,
    'config',
    'update',
    '--noble-seed',
    'foo',
    '--eth-seed',
    'bar',
    '--agoric-api',
    '127.0.0.1:1111',
    '--eth-rpc',
    '127.0.0.1:2222',
    '--noble-rpc',
    '127.0.0.1:3333',
    '--noble-api',
    '127.0.0.1:4444',
    '--noble-to-agoric-channel',
    'channel-101',
    '--token-messenger-address',
    '0xmessenger123',
    '--token-contract-address',
    '0xtoken123',
  ]);

  t.deepEqual(config.getUpdateArgs(), [
    './test/.fast-usdc/config.json',
    {
      agoricApi: '127.0.0.1:1111',
      ethRpc: '127.0.0.1:2222',
      ethSeed: 'bar',
      nobleRpc: '127.0.0.1:3333',
      nobleSeed: 'foo',
      nobleApi: '127.0.0.1:4444',
      nobleToAgoricChannel: 'channel-101',
      tokenMessengerAddress: '0xmessenger123',
      tokenContractAddress: '0xtoken123',
    },
  ]);
});

test('CLI calls config show', t => {
  const homeDir = './test/.fast-usdc/';
  const config = mockConfig();
  const program = initProgram(config, mockTransfer());

  program.parse(['node', CLI_PATH, '--home', homeDir, 'config', 'show']);

  t.deepEqual(config.getShowArgs(), ['./test/.fast-usdc/config.json']);
});

test('CLI calls transfer with args', t => {
  const homeDir = './test/.fast-usdc/';
  const transfer = mockTransfer();
  const program = initProgram(mockConfig(), transfer);

  program.parse([
    'node',
    CLI_PATH,
    '--home',
    homeDir,
    'transfer',
    '450000',
    'dydx123456',
  ]);

  t.deepEqual(transfer.getTransferArgs(), [
    './test/.fast-usdc/config.json',
    '450000',
    'dydx123456',
  ]);
});
