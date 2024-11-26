import '@endo/init/debug.js';
import { execFileSync } from 'node:child_process';
import { makeAgd } from './synthetic-chain-excerpt.js';
import { GOV4ADDR } from './agoric-tools.js';

const agd = makeAgd({ execFileSync }).withOpts({ keyringBackend: 'test' });

agd.keys.add(
  'gov4',
  'smile unveil sketch gaze length bulb goddess street case exact table fetch robust chronic power choice endorse toward pledge dish access sad illegal dance',
);

agd.tx(
  ['swingset', 'provision-one', 'faucet_provision', GOV4ADDR, 'SMART_WALLET'],
  {
    chainId: 'agoriclocal',
    from: 'validator',
    yes: true,
  },
);
