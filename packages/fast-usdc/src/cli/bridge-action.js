import { boardSlottingMarshaller } from '@agoric/client-utils';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {Writable} from 'stream';
 */

const defaultMarshaller = boardSlottingMarshaller();

/** @typedef {ReturnType<boardSlottingMarshaller>} BoardSlottingMarshaller */

/**
 * @param {BridgeAction} bridgeAction
 * @param {Pick<Writable,'write'>} stdout
 * @param {BoardSlottingMarshaller} marshaller
 */
const outputAction = (bridgeAction, stdout, marshaller) => {
  const capData = marshaller.toCapData(harden(bridgeAction));
  stdout.write(JSON.stringify(capData));
  stdout.write('\n');
};

export const sendHint =
  'Now use `agoric wallet send ...` to sign and broadcast the offer.\n';

/**
 * @param {BridgeAction} bridgeAction
 * @param {{
 *   stdout: Pick<Writable,'write'>,
 *   stderr: Pick<Writable,'write'>,
 * }} io
 * @param {BoardSlottingMarshaller | undefined} marshaller
 */
export const outputActionAndHint = (
  bridgeAction,
  { stdout, stderr },
  marshaller = defaultMarshaller,
) => {
  outputAction(bridgeAction, stdout, marshaller);
  stderr.write(sendHint);
};
