import '@endo/init/debug.js';
import assert from 'node:assert/strict';
import process from 'node:process';
import { createRequire } from 'node:module';

const native = createRequire(import.meta.url)('@agoric/cosmos');
assert.equal(typeof native.start, 'function');
assert.equal(native.send, undefined);
assert.equal(native.runAgCosmosDaemon, undefined);
assert.throws(() => native.start(null, ['agd']), /handler/);
assert.throws(() => native.start(() => {}, []), /argv/);
assert.throws(() => native.start(() => {}, ['agd', 42]), /argv/);
assert.throws(() => native.start(() => {}, Array(1)), /argv/);
const operation = process.argv[3] || 'version';
const commandArgs =
  operation === 'init'
    ? ['init', 'bridge-probe', '--chain-id=agcc-contract']
    : [operation];
const sender = native.start(
  (nodePort, messageJSON, replier) => {
    assert.equal(nodePort, 1);
    assert.equal(operation, 'start');
    assert.equal(typeof messageJSON, 'string');
    assert.equal(typeof replier.resolve, 'function');
    const port = 2 ** 31 - 1;
    const error = `unregistered port ${port}`;
    assert.deepEqual(JSON.parse(sender.send(port, '{}')), { error });
    assert.throws(
      () =>
        sender.send(port, '{}', {
          handleError: reason => {
            throw Error(reason);
          },
        }),
      { message: error },
    );
    assert.equal(
      sender.send(port, '{}', {
        handleError: reason => `handled: ${reason}`,
      }),
      `handled: ${error}`,
    );
    console.error('native-service-error-ok');
    process.exit(0);
  },
  ['ag-chain-cosmos', ...commandArgs, `--home=${process.argv[2]}`],
);
assert.deepEqual(Object.keys(sender), ['send']);
assert.throws(() => native.start(() => {}, ['agd']), /multiple/);
for (const port of [0, -1, 1.5, 2 ** 31, NaN, Infinity, 'r1']) {
  assert.throws(() => sender.send(port, '{}'), /port/);
}
assert.throws(() => sender.send(1, {}), /string/);
console.error('native-contract-ok');
if (operation === 'version') process.exit(0);
