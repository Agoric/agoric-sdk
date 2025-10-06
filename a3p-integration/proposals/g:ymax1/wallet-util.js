// @ts-check
import { agoric, mkTemp } from '@agoric/synthetic-chain';
import { writeFile } from 'node:fs/promises';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 * @import {VstorageKit} from '@agoric/client-utils';
 */

/**
 * @param {VstorageKit} vsc
 * @param {string} addr
 * @param {BridgeAction} action
 */
export const sendWalletAction = async (vsc, addr, action) => {
  const capData = vsc.marshaller.toCapData(harden(action));
  const f1 = await mkTemp('offer-send-XXX');
  await writeFile(f1, JSON.stringify(capData), 'utf-8');
  return agoric.wallet(
    'send',
    '--from',
    addr,
    '--keyring-backend=test',
    '--offer',
    f1,
  );
};

/** @param {string} name */
export const makeActionId = name => `${name}-${Date.now()}`;
