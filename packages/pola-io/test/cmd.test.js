import test from 'ava';
import { makeCmdRunner } from '../src/cmd.js';

const mockExecFile = () => Promise.resolve({ stdout: '', stderr: '' });

test('makeCmdRunner returns frozen object', t => {
  const cmdRunner = makeCmdRunner('ls', { execFile: mockExecFile });
  t.true(Object.isFrozen(cmdRunner), 'CmdRunner object should be frozen');
});

test('makeCmdRunner subCommand returns frozen object', t => {
  const cmdRunner = makeCmdRunner('git', { execFile: mockExecFile });
  const subCmd = cmdRunner.subCommand('status');
  t.true(Object.isFrozen(subCmd), 'SubCommand object should be frozen');
});

test('makeCmdRunner withFlags returns frozen object', t => {
  const cmdRunner = makeCmdRunner('ls', { execFile: mockExecFile });
  const withFlags = cmdRunner.withFlags('-la');
  t.true(Object.isFrozen(withFlags), 'WithFlags object should be frozen');
});
