import { makeCmdRunner } from '@agoric/pola-io/src/ambient/cmd.js';

export const makeCosmosCommand = (
  cmd: string[],
  opts: { envPrefix: string; node: string; from: string; chainId: string },
  io?: Parameters<typeof makeCmdRunner>[1],
) => {
  const pfx = (name: string) => `${opts.envPrefix}${name}`;
  const appCmdEnv = {
    [pfx('NODE')]: opts.node,
    [pfx('FROM')]: opts.from,
    [pfx('CHAIN_ID')]: opts.chainId,
    [pfx('KEYRING_BACKEND')]: 'test', // XXX we can do better
    [pfx('BROADCAST_MODE')]: 'block',
    // [pfx('OUTPUT')]: 'json',
  };

  const rawOutput = makeCmdRunner(cmd[0], io)
    .withEnv(appCmdEnv)
    .withArgs(...cmd.slice(1));

  const appCmd = rawOutput.withEnv({ [pfx('OUTPUT')]: 'json' });

  // Ideally, we'd just return appCmd here.  Instead, do a workaround for silly
  // `--output` flag that isn't ignored by `agd keys show`.
  return harden({
    ...appCmd,
    rawOutput,
  });
};
harden(makeCosmosCommand);

export type CosmosCommand = ReturnType<typeof makeCosmosCommand>;
