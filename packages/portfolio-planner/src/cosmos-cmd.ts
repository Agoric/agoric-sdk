import { makeCmdRunner } from '@agoric/pola-io/src/ambient/cmd.js';

// Might be useful to contribute back to @agoric/pola-io...
const withArgs = (
  baseCmd: ReturnType<typeof makeCmdRunner>,
  ...args: string[]
) => {
  if (args.length === 0) {
    return baseCmd;
  }
  return baseCmd.subCommand(args[0], args.slice(1));
};

export const makeCosmosCommand = (
  cmd: string[],
  opts: { node: string; from: string; chainId: string },
  io: { execFile?: any } = {},
) => {
  const appCmd = withArgs(makeCmdRunner(cmd[0], io), ...cmd.slice(1));

  const flags = {
    node: [`--node=${opts.node}`],
    keyring: [`--keyring-backend=test`], // XXX we can do better
    sign: [`--from=${opts.from}`, `--chain-id=${opts.chainId}`],
    broadcast: [`--broadcast-mode=block`],
    output: [`--output=json`],
    chainId: [`--chain-id=${opts.chainId}`],
  } as const;

  const appExec = async (
    args: readonly (string | readonly string[])[],
    options?: any,
  ) => {
    return appCmd.exec(args.flat(), options);
  };

  const appChainD = {
    ...appCmd,
    exec(args: string[], options?: any) {
      switch (args[0]) {
        case 'status':
          return appExec([args[0], flags.node], options);
        case 'keys':
          return appExec([args[0], flags.keyring, args.slice(1)], options);
        case 'query':
        case 'q':
          return appExec(
            [args[0], flags.node, flags.output, args.slice(1)],
            options,
          );
        case 'tx': {
          const txArgs = [
            args[0],
            flags.node,
            flags.sign,
            flags.broadcast,
            flags.keyring,
            flags.output,
            args.slice(1),
          ];
          return appExec(txArgs, options);
        }
        default:
          return appExec(args, options);
      }
    },
  };

  return appChainD;
};
harden(makeCosmosCommand);

export type CosmosCommand = ReturnType<typeof makeCosmosCommand>;
