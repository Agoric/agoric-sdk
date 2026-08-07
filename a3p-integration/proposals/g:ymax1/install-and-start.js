#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file install and start ymax1 using ymaxControl, run from use.sh so the
 * deployment is live with a stable vatID by the end of this proposal layer.
 */
// @ts-check
import '@endo/init/legacy.js'; // XXX axios

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { makeYmaxControlKitForSynthetic } from '@aglocal/portfolio-deploy/src/ymax-control.js';
import { readFile } from 'node:fs/promises';
import { makeSyntheticWalletKit } from './synthetic-wallet-kit.js';
import { ymax1BundleId, ymax1ControlAddr } from './consts.js';

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const syntheticWallet = makeSyntheticWalletKit({
  address: ymax1ControlAddr,
  vstorageKit: vsc,
});
const { ymaxControl } = makeYmaxControlKitForSynthetic(
  { setTimeout },
  {
    signer: syntheticWallet,
    log: console.error,
    makeNonce: () => String(Date.now()),
  },
);

const { BLD, USDC, PoC26 } = fromEntries(
  await vsc.readPublished('agoricNames.issuer'),
);
const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });
const privateArgsOverrides = harden(
  JSON.parse(await readFile('./privateArgsOverrides-ymax1-base.json', 'utf8')),
);

await ymaxControl.installAndStart({
  bundleId: ymax1BundleId,
  issuers,
  privateArgsOverrides,
});

console.error('ymax1 installed and started');
