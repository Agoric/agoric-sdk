/** @file terminate a ymax contract via ymaxControl */
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';
import { getYmaxControlKit } from './ymax-admin-helpers.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
  message: { type: 'string' },
} as const;

const terminateYmax = async ({ scriptArgs, makeAccount }: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const { message, contract } = values;
  if (!message) throw Error('--message missing');
  const { ymaxControl } = await getYmaxControlKit(makeAccount, contract);
  await ymaxControl.terminate({ message });
};

export default terminateYmax;
