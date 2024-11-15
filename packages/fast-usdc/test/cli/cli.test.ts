import '@endo/init/legacy.js';
import test from 'ava';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initProgram } from '../../src/cli/cli.js';

const dir = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(dir, '../../src/cli/bin.js');

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

test('shows help when run without arguments', async t => {
  const output = await collectStdErr([CLI_PATH]);
  // Replace home path (e.g. "/home/samsiegart/.fast-usdc") with "~/.fast-usdc" so snapshots work on different machines.
  const regex = /"\/(.+\/)?\.fast-usdc\/"/g;
  const result = (output as string).replace(regex, '"~/.fast-usdc"');

  t.snapshot(result);
});

test('shows help for transfer command', async t => {
  const output = await collectStdOut([CLI_PATH, 'transfer', '-h']);

  t.snapshot(output);
});

test('shows help for config command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', '-h']);

  t.snapshot(output);
});

test('shows help for config init command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', 'init', '-h']);

  t.snapshot(output);
});

test('shows help for config update command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', 'update', '-h']);

  t.snapshot(output);
});

test('shows help for config show command', async t => {
  const output = await collectStdOut([CLI_PATH, 'config', 'show', '-h']);

  t.snapshot(output);
});

test('shows help for deposit command', async t => {
  const output = await collectStdOut([CLI_PATH, 'deposit', '-h']);

  t.snapshot(output);
});

test('shows help for withdraw command', async t => {
  const output = await collectStdOut([CLI_PATH, 'withdraw', '-h']);

  t.snapshot(output);
});

test('shows error when deposit command is run without options', async t => {
  const output = await collectStdErr([CLI_PATH, 'deposit']);

  t.snapshot(output);
});

test('shows error when deposit command is run with invalid amount', async t => {
  const output = await collectStdErr([CLI_PATH, 'deposit', 'not-a-number']);

  t.snapshot(output);
});

test('shows error when deposit command is run with invalid fee', async t => {
  const output = await collectStdErr([
    CLI_PATH,
    'deposit',
    '50',
    '--fee',
    'not-a-number',
  ]);

  t.snapshot(output);
});

test('shows error when withdraw command is run without options', async t => {
  const output = await collectStdErr([CLI_PATH, 'withdraw']);

  t.snapshot(output);
});

test('shows error when withdraw command is run with invalid amount', async t => {
  const output = await collectStdErr([CLI_PATH, 'withdraw', 'not-a-number']);

  t.snapshot(output);
});

test('shows error when withdraw command is run with invalid fee', async t => {
  const output = await collectStdErr([
    CLI_PATH,
    'withdraw',
    '50',
    '--fee',
    'not-a-number',
  ]);

  t.snapshot(output);
});

test('shows error when config init command is run without options', async t => {
  const output = await collectStdErr([CLI_PATH, 'config', 'init']);

  t.snapshot(output);
});

test('shows error when transfer command is run without options', async t => {
  const output = await collectStdErr([CLI_PATH, 'transfer']);

  t.snapshot(output);
});

test('shows error when config init command is run without eth seed', async t => {
  const output = await collectStdErr([
    CLI_PATH,
    'config',
    'init',
    '--noble-seed',
    'foo',
    '--agoric-seed',
    'bar',
  ]);

  t.snapshot(output);
});

test('shows error when config init command is run without agoric seed', async t => {
  const output = await collectStdErr([
    CLI_PATH,
    'config',
    'init',
    '--noble-seed',
    'foo',
    '--eth-seed',
    'bar',
  ]);

  t.snapshot(output);
});

test('shows error when config init command is run without noble seed', async t => {
  const output = await collectStdErr([
    CLI_PATH,
    'config',
    'init',
    '--agoric-seed',
    'foo',
    '--eth-seed',
    'bar',
  ]);

  t.snapshot(output);
});

test('calls config init with default args', t => {
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
    '--agoric-seed',
    'bazinga',
  ]);

  const args = config.getInitArgs();
  t.is(args.shift().path, `${homeDir}config.json`);
  t.deepEqual(args, [
    {
      agoricSeed: 'bazinga',
      agoricApi: 'http://127.0.0.1:1317',
      agoricRpc: 'http://127.0.0.1:26656',
      ethRpc: 'http://127.0.0.1:8545',
      ethSeed: 'bar',
      nobleRpc: 'http://127.0.0.1:26657',
      nobleSeed: 'foo',
      nobleApi: 'http://127.0.0.1:1318',
      nobleToAgoricChannel: 'channel-21',
      tokenMessengerAddress: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
      tokenContractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
  ]);
});

test('calls config init with optional args', t => {
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
    '--agoric-seed',
    'bazinga',
    '--agoric-api',
    '127.0.0.1:0000',
    '--agoric-rpc',
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

  const args = config.getInitArgs();
  t.is(args.shift().path, `${homeDir}config.json`);
  t.deepEqual(args, [
    {
      agoricApi: '127.0.0.1:0000',
      agoricSeed: 'bazinga',
      agoricRpc: '127.0.0.1:1111',
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

test('calls config update with args', t => {
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
    '--agoric-seed',
    'bazinga',
    '--agoric-api',
    '127.0.0.1:0000',
    '--agoric-rpc',
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

  const args = config.getUpdateArgs();
  t.is(args.shift().path, `${homeDir}config.json`);
  t.deepEqual(args, [
    {
      agoricSeed: 'bazinga',
      agoricApi: '127.0.0.1:0000',
      agoricRpc: '127.0.0.1:1111',
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

test('calls config show', t => {
  const homeDir = './test/.fast-usdc/';
  const config = mockConfig();
  const program = initProgram(config, mockTransfer());

  program.parse(['node', CLI_PATH, '--home', homeDir, 'config', 'show']);

  t.is(config.getShowArgs()[0].path, './test/.fast-usdc/config.json');
});

test('calls transfer with args', t => {
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

  const args = transfer.getTransferArgs();
  t.is(args.shift().path, `${homeDir}config.json`);
  t.deepEqual(args, ['450000', 'dydx123456']);
});
