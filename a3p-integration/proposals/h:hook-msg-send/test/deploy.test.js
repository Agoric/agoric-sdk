// @ts-check
/* eslint-env node */
import '@endo/init/legacy.js'; // axios compat

import test from 'ava';
import { getIncarnation } from '@agoric/synthetic-chain';

test(`localchain incarnation reflects hookMsgSend`, async t => {
  const history = { hookMsgSend: 4 };
  t.is(await getIncarnation('localchain'), history.hookMsgSend);
});

test(`transfer incarnation reflects hookMsgSend`, async t => {
  const history = { hookMsgSend: 4 };
  t.is(await getIncarnation('transfer'), history.hookMsgSend);
});
