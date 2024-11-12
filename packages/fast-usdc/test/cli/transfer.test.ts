import test from 'ava';
import transfer from '../../src/cli/transfer.js';
import { mockOut, mockFile } from '../../testing/mocks.js';

test('Errors if config missing', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const out = mockOut();
  const file = mockFile(path);

  // @ts-expect-error mocking partial Console
  await transfer.transfer(file, '1500000', 'noble1234', out);

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "config init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
});

// TODO: test transfer actually works... maybe reserved for e2e test?
