/* globals setTimeout */
// eslint-disable-next-line import/no-extraneous-dependencies
import { E } from '@endo/eventual-send';

const PONG_TIMEOUT = 10_000;

export default async function deployPlugin(
  homePromise,
  { installUnsafePlugin },
) {
  const plugin = await installUnsafePlugin('./src/plugin.js', {});
  const result = await Promise.race([
    E(plugin).ping(),
    new Promise(resolve => setTimeout(resolve, PONG_TIMEOUT, 'timeout')),
  ]);
  if (result !== 'pong') {
    throw new Error(`ping failed ${result}`);
  }
}
