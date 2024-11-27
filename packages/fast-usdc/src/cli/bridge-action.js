import { boardSlottingMarshaller } from '@agoric/client-utils';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

const marshaller = boardSlottingMarshaller();

/**
 * @param {BridgeAction} bridgeAction
 * @param {Pick<import('stream').Writable,'write'>} stdout
 */
const outputAction = (bridgeAction, stdout) => {
  const capData = marshaller.toCapData(harden(bridgeAction));
  stdout.write(JSON.stringify(capData));
  stdout.write('\n');
};

export const sendHint =
  'Now use `agoric wallet send ...` to sign and broadcast the offer.\n';

/**
 * @param {BridgeAction} bridgeAction
 * @param {{
 *   stdout: Pick<import('stream').Writable,'write'>,
 *   stderr: Pick<import('stream').Writable,'write'>,
 * }} io
 */
export const outputActionAndHint = (bridgeAction, { stdout, stderr }) => {
  outputAction(bridgeAction, stdout);
  stderr.write(sendHint);
};
