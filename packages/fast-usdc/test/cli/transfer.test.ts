import test from 'ava';
import mockfs from 'mock-fs';
import transfer from '../../src/cli/transfer.js';
import { mockOut } from '../../testing/mocks.js';

test('Errors if config missing', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  mockfs({});
  const out = mockOut();

  // @ts-expect-error mocking partial Console
  await transfer.transfer(path, '1500000', 'noble1234', out);

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "config init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
});

// TODO: test transfer actually works... maybe reserved for e2e test?
