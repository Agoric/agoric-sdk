#!/usr/bin/env -S node --import ts-blank-space/register
// @ts-check
import '@endo/init/legacy.js'; // XXX axios

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { makeYmaxControlKitForSynthetic } from '@aglocal/portfolio-deploy/src/ymax-control.js';
import { readFile } from 'node:fs/promises';
import { makeSyntheticWalletKit } from './synthetic-wallet-kit.js';

const ymaxControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';
const bundleId =
  'b1-03d5ff17d1f29f8d1993525d0a9e82e6cd74b117a64cff64d3ca7e246bc69428d8e7d6947b69ee6bf37c024d16920490e684f83f263d6fed0c6ba875d57bf621';

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const syntheticWallet = makeSyntheticWalletKit({
  address: ymaxControlAddr,
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

const { BLD, USDC, PoC26 } = Object.fromEntries(
  await vsc.readPublished('agoricNames.issuer'),
);
const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });
const privateArgsOverrides = harden(
  JSON.parse(await readFile('./privateArgsOverrides-2604.json', 'utf8')),
);

await ymaxControl.terminate({
  message: 'replace A3P ymax0 with the 2605 release fixture',
});
await ymaxControl.installAndStart({
  bundleId,
  issuers,
  privateArgsOverrides,
});

console.error('ymax0 restarted from ymax-v0.3.2605-beta1');
